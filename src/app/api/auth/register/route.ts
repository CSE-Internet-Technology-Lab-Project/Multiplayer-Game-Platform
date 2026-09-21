import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { sessionCookie, signSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { username?: string; email?: string; password?: string } | null;
  const username = body?.username?.trim(), email = body?.email?.trim().toLowerCase(), password = body?.password;
  if (!username || !email || !password || username.length < 3 || password.length < 8 || !email.includes("@")) return NextResponse.json({ error: "Use a username of 3+ characters, a valid email, and a password of 8+ characters." }, { status: 400 });
  try { const user = await prisma.user.create({ data: { username, email, passwordHash: await bcrypt.hash(password, 12) }, select: { id: true, username: true, email: true, score: true } }); const response = NextResponse.json({ user }, { status: 201 }); response.cookies.set(sessionCookie(signSession(user.id))); return response; }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "That username or email is already in use." }, { status: 409 });
    console.error("Registration failed", error);
    return NextResponse.json({ error: "Could not create your account. Confirm that PostgreSQL is running and migrations have been applied." }, { status: 500 });
  }
}
