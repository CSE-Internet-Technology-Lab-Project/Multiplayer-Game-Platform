import { NextResponse } from "next/server";
import { roomCode } from "@/lib/game";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function GET() { try { await requireUser(); const rooms = await prisma.gameRoom.findMany({ where: { status: "WAITING" }, orderBy: { createdAt: "desc" }, include: { playerX: { select: { username: true } } } }); return NextResponse.json({ rooms }); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); } }
export async function POST() { try { const user = await requireUser(); let code = roomCode(); while (await prisma.gameRoom.findUnique({ where: { code } })) code = roomCode(); const room = await prisma.gameRoom.create({ data: { code, playerXId: user.id } }); return NextResponse.json({ room }, { status: 201 }); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); } }
