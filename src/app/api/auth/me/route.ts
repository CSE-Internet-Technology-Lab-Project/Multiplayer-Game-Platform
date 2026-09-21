import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";

// Being signed out is the normal initial state, not an API failure. Protected
// APIs still return 401 through requireUser().
export async function GET() {
  const user = await currentUser();
  return NextResponse.json({ user });
}
