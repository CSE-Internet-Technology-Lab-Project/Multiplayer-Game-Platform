import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function GET() { try { const user = await requireUser(); const where = { OR: [{ playerXId: user.id }, { playerOId: user.id }] }; const [played, wins, draws] = await Promise.all([prisma.match.count({ where }), prisma.match.count({ where: { winnerId: user.id } }), prisma.match.count({ where: { outcome: "DRAW", ...where } })]); return NextResponse.json({ played, wins, draws, winRate: played ? Math.round(wins / played * 100) : 0 }); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); } }
