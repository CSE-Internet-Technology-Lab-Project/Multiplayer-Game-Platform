import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
const COOKIE_NAME = "ttt_session";
// JWT_SECRET is supported for existing local environments; AUTH_SECRET is the
// documented production name. The Socket.IO service uses this same module.
const secret = () => process.env.AUTH_SECRET || process.env.JWT_SECRET || "development-only-change-me";
export type SessionUser = { id: string; username: string; email: string; score: number };
export function signSession(userId: string) { const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + 604800000 })).toString("base64url"); const signature = crypto.createHmac("sha256", secret()).update(payload).digest("base64url"); return `${payload}.${signature}`; }
export function userIdFromToken(token?: string) { if (!token) return null; const [payload, signature] = token.split("."); if (!payload || !signature) return null; const expected = crypto.createHmac("sha256", secret()).update(payload).digest("base64url"); if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null; try { const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { userId: string; exp: number }; return data.exp > Date.now() ? data.userId : null; } catch { return null; } }
export async function currentUser(): Promise<SessionUser | null> { const id = userIdFromToken((await cookies()).get(COOKIE_NAME)?.value); return id ? prisma.user.findUnique({ where: { id }, select: { id: true, username: true, email: true, score: true } }) : null; }
export async function requireUser() { const user = await currentUser(); if (!user) throw new Error("UNAUTHORIZED"); return user; }
export const sessionCookie = (token: string) => ({ name: COOKIE_NAME, value: token, httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 604800 });
export const expiredSessionCookie = { name: COOKIE_NAME, value: "", httpOnly: true, path: "/", maxAge: 0 };
