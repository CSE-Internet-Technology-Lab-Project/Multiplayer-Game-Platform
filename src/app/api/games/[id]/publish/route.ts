import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const existing = await prisma.gameDefinition.findFirst({ where: { id, creatorId: user.id } });
    if (!existing) return NextResponse.json({ error: "Game definition not found." }, { status: 404 });
    const game = await prisma.gameDefinition.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    return NextResponse.json({ game });
  } catch {
    return NextResponse.json({ error: "Could not publish game definition." }, { status: 500 });
  }
}
