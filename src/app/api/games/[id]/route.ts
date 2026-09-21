import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const game = await prisma.gameDefinition.findFirst({ where: { id, OR: [{ status: "PUBLISHED" }, { creatorId: user.id }] } });
    if (!game) return NextResponse.json({ error: "Game definition not found." }, { status: 404 });
    return NextResponse.json({ game });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
