import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireUser();
    const events = await prisma.gameEvent.findMany({ where: { actorId: user.id }, orderBy: { occurredAt: "desc" }, take: 50, select: { id: true, roomId: true, type: true, payload: true, occurredAt: true } });
    return NextResponse.json({ events });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
