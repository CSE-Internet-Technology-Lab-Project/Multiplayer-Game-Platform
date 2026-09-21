import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET() {
  try {
    const user = await requireUser();
    const games = await prisma.gameDefinition.findMany({
      where: { OR: [{ status: "PUBLISHED" }, { creatorId: user.id }] },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      select: { id: true, slug: true, name: true, description: true, category: true, version: true, status: true, definition: true, creatorId: true, publishedAt: true, updatedAt: true },
    });
    return NextResponse.json({ games });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => null) as { slug?: string; name?: string; description?: string; category?: string; definition?: unknown } | null;
    const slug = body?.slug?.trim().toLowerCase();
    const name = body?.name?.trim();
    const description = body?.description?.trim();
    const category = body?.category?.trim().toLowerCase();
    if (!slug || !slugPattern.test(slug) || !name || name.length > 80 || !description || description.length > 500 || !category || !body?.definition || typeof body.definition !== "object") {
      return NextResponse.json({ error: "Provide a valid slug, name, description, category, and structured game definition." }, { status: 400 });
    }
    const game = await prisma.gameDefinition.create({ data: { slug, name, description, category, definition: body.definition, creatorId: user.id } });
    return NextResponse.json({ game }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "That game slug is already in use." }, { status: 409 });
    return NextResponse.json({ error: "Could not create game definition." }, { status: 500 });
  }
}
