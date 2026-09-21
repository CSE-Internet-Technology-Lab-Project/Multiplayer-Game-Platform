import { MatchOutcome, Prisma, RoomStatus } from "@/generated/prisma/client";
import { Board, Mark, winner } from "@/lib/game";
import { prisma } from "@/lib/prisma";
import { createLudoState, LudoState } from "@/lib/games/ludo-adapter";
import { playableGame } from "@/lib/games/registry";
import type { GameAdapter } from "@/lib/game-contract";

const roomInclude = { playerX: { select: { id: true, username: true, score: true } }, playerO: { select: { id: true, username: true, score: true } }, participants: { include: { user: { select: { id: true, username: true, score: true } } } }, gameDefinition: { select: { id: true, slug: true, name: true, category: true, version: true, definition: true } } } as const;
export async function getRoom(id: string) { return prisma.gameRoom.findUnique({ where: { id }, include: roomInclude }); }
export async function joinRoom(roomId: string, userId: string) {
  const room = await prisma.$transaction(async (tx) => { const found = await tx.gameRoom.findUnique({ where: { id: roomId }, include: { participants: true } }); if (!found) throw new Error("Room not found"); if (found.playerXId === userId || found.playerOId === userId) return found; if (found.status !== RoomStatus.WAITING || found.playerOId) throw new Error("This room is full or already playing"); const sequence = await tx.gameEvent.count({ where: { roomId } }) + 1; const participants = [...found.participants, { userId, team: "B" }]; const board = found.gameType === "ludo" ? createLudoState(participants.map(({ userId: participantId, team }) => ({ userId: participantId, team }))) : undefined; return tx.gameRoom.update({ where: { id: roomId }, data: { playerOId: userId, status: RoomStatus.ACTIVE, startedAt: new Date(), turn: found.gameType === "ludo" ? found.playerXId : undefined, ...(board ? { board } : {}), participants: { create: { userId, team: "B" } }, events: { create: { actorId: userId, type: "PLAYER_JOINED", sequence, payload: { team: "B" } } } } }); });
  return prisma.gameRoom.findUniqueOrThrow({ where: { id: room.id }, include: roomInclude });
}
export async function makeMove(roomId: string, userId: string, cell: number) {
  if (!Number.isInteger(cell) || cell < 0 || cell > 8) throw new Error("Invalid board cell");
  await prisma.$transaction(async (tx) => { const room = await tx.gameRoom.findUnique({ where: { id: roomId } }); if (!room || room.status !== RoomStatus.ACTIVE || !room.playerOId) throw new Error("Game is not active"); const mark: Mark | null = room.playerXId === userId ? "X" : room.playerOId === userId ? "O" : null; if (!mark) throw new Error("You are not a player in this room"); if (room.turn !== mark) throw new Error("It is not your turn"); const board = room.board as Board; if (board[cell]) throw new Error("That square is already taken"); board[cell] = mark; const result = winner(board); const sequence = await tx.gameEvent.count({ where: { roomId } }) + 1; await tx.gameEvent.create({ data: { roomId, actorId: userId, type: "MOVE_PLAYED", sequence, payload: { cell, mark } } }); if (!result) { await tx.gameRoom.update({ where: { id: roomId }, data: { board, turn: mark === "X" ? "O" : "X" } }); return; } const winningId = result === "X" ? room.playerXId : result === "O" ? room.playerOId : null; await tx.gameRoom.update({ where: { id: roomId }, data: { board, status: RoomStatus.FINISHED, winnerId: winningId, finishedAt: new Date() } }); await tx.match.create({ data: { roomId, playerXId: room.playerXId, playerOId: room.playerOId, winnerId: winningId, outcome: result === "X" ? MatchOutcome.X_WIN : result === "O" ? MatchOutcome.O_WIN : MatchOutcome.DRAW, moves: board.filter(Boolean).length } }); await tx.gameEvent.create({ data: { roomId, actorId: userId, type: "MATCH_FINISHED", sequence: sequence + 1, payload: { outcome: result, winnerId: winningId } } }); if (winningId) await tx.user.update({ where: { id: winningId }, data: { score: { increment: 3 } } }); else await tx.user.updateMany({ where: { id: { in: [room.playerXId, room.playerOId] } }, data: { score: { increment: 1 } } }); });
  return prisma.gameRoom.findUniqueOrThrow({ where: { id: roomId }, include: roomInclude });
}

export async function makeGameAction(roomId: string, userId: string, action: { type: string; payload: Record<string, unknown> }) {
  let resultRoomId = roomId;
  await prisma.$transaction(async (tx) => {
    const room = await tx.gameRoom.findUnique({ where: { id: roomId }, include: { participants: true } });
    if (!room || room.status !== RoomStatus.ACTIVE) throw new Error("Game is not active");
    const adapter = playableGame(room.gameType) as GameAdapter<LudoState> | undefined;
    if (!adapter) throw new Error("This game has no playable adapter");
    const context = { roomId, actorId: userId, participants: room.participants.map((participant) => ({ userId: participant.userId, team: participant.team })) };
    adapter.validateAction(room.board as unknown as LudoState, action, context);
    const nextState = adapter.applyAction(room.board as unknown as LudoState, action, context);
    const outcome = adapter.getResult(nextState, context);
    const sequence = await tx.gameEvent.count({ where: { roomId } }) + 1;
    await tx.gameEvent.create({ data: { roomId, actorId: userId, type: action.type.toUpperCase(), sequence, payload: action.payload as Prisma.InputJsonValue } });
    await tx.gameRoom.update({ where: { id: roomId }, data: { board: nextState as unknown as Prisma.InputJsonValue, turn: nextState.players[nextState.turnIndex]?.userId || userId, ...(outcome.status === "FINISHED" ? { status: RoomStatus.FINISHED, winnerId: outcome.winnerId, finishedAt: new Date() } : {}) } });
    if (outcome.status === "FINISHED" && room.playerOId) { const winnerId = outcome.winnerId || null; await tx.match.create({ data: { roomId, playerXId: room.playerXId, playerOId: room.playerOId, winnerId, outcome: winnerId === room.playerXId ? MatchOutcome.X_WIN : winnerId === room.playerOId ? MatchOutcome.O_WIN : MatchOutcome.DRAW, moves: nextState.moves } }); if (winnerId) await tx.user.update({ where: { id: winnerId }, data: { score: { increment: outcome.scores?.[winnerId] || 10 } } }); }
    resultRoomId = roomId;
  });
  return prisma.gameRoom.findUniqueOrThrow({ where: { id: resultRoomId }, include: roomInclude });
}
