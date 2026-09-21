import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function GET() { try { await requireUser(); return NextResponse.json({ players: await prisma.user.findMany({ select: { id: true, username: true, score: true }, orderBy: [{ score: "desc" }, { createdAt: "asc" }], take: 10 }) }); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); } }
