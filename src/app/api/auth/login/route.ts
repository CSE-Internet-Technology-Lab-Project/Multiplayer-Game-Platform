import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { sessionCookie, signSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
    const user = body?.email ? await prisma.user.findUnique({ where: { email: body.email.trim().toLowerCase() } }) : null;
    if (!user || !body?.password || !(await bcrypt.compare(body.password, user.passwordHash))) return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    const response = NextResponse.json({ user: { id: user.id, username: user.username, email: user.email, score: user.score } }); response.cookies.set(sessionCookie(signSession(user.id))); return response;
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "Could not sign in. Confirm that PostgreSQL is running and migrations have been applied." }, { status: 500 });
  }
}
