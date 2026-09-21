import { MatchOutcome, RoomStatus } from "@/generated/prisma/client";
import { Board, Mark, winner } from "@/lib/game";
import { prisma } from "@/lib/prisma";

const roomInclude = { playerX: { select: { id: true, username: true, score: true } }, playerO: { select: { id: true, username: true, score: true } } } as const;
export async function getRoom(id: string) { return prisma.gameRoom.findUnique({ where: { id }, include: roomInclude }); }
export async function joinRoom(roomId: string, userId: string) {
  const room = await prisma.$transaction(async (tx) => { const found = await tx.gameRoom.findUnique({ where: { id: roomId } }); if (!found) throw new Error("Room not found"); if (found.playerXId === userId || found.playerOId === userId) return found; if (found.status !== RoomStatus.WAITING || found.playerOId) throw new Error("This room is full or already playing"); return tx.gameRoom.update({ where: { id: roomId }, data: { playerOId: userId, status: RoomStatus.ACTIVE, startedAt: new Date() } }); });
  return prisma.gameRoom.findUniqueOrThrow({ where: { id: room.id }, include: roomInclude });
}
export async function makeMove(roomId: string, userId: string, cell: number) {
  if (!Number.isInteger(cell) || cell < 0 || cell > 8) throw new Error("Invalid board cell");
  await prisma.$transaction(async (tx) => { const room = await tx.gameRoom.findUnique({ where: { id: roomId } }); if (!room || room.status !== RoomStatus.ACTIVE || !room.playerOId) throw new Error("Game is not active"); const mark: Mark | null = room.playerXId === userId ? "X" : room.playerOId === userId ? "O" : null; if (!mark) throw new Error("You are not a player in this room"); if (room.turn !== mark) throw new Error("It is not your turn"); const board = room.board as Board; if (board[cell]) throw new Error("That square is already taken"); board[cell] = mark; const result = winner(board); if (!result) { await tx.gameRoom.update({ where: { id: roomId }, data: { board, turn: mark === "X" ? "O" : "X" } }); return; } const winningId = result === "X" ? room.playerXId : result === "O" ? room.playerOId : null; await tx.gameRoom.update({ where: { id: roomId }, data: { board, status: RoomStatus.FINISHED, winnerId: winningId, finishedAt: new Date() } }); await tx.match.create({ data: { roomId, playerXId: room.playerXId, playerOId: room.playerOId, winnerId: winningId, outcome: result === "X" ? MatchOutcome.X_WIN : result === "O" ? MatchOutcome.O_WIN : MatchOutcome.DRAW, moves: board.filter(Boolean).length } }); if (winningId) await tx.user.update({ where: { id: winningId }, data: { score: { increment: 3 } } }); else await tx.user.updateMany({ where: { id: { in: [room.playerXId, room.playerOId] } }, data: { score: { increment: 1 } } }); });
  return prisma.gameRoom.findUniqueOrThrow({ where: { id: roomId }, include: roomInclude });
}
