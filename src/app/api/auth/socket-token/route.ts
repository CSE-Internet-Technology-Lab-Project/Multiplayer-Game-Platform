import { NextResponse } from "next/server";
import { requireUser, signSession } from "@/lib/auth";
export async function GET() { try { const user = await requireUser(); return NextResponse.json({ token: signSession(user.id) }); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); } }
