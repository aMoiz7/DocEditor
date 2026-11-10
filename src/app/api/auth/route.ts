import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getUser, listUsers } from "@/lib/db";

export async function GET() {
  try {
    return NextResponse.json({ user: await currentUser(), users: await listUsers() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "PostgreSQL is unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const { userId } = await request.json();
  const user = await getUser(userId);
  if (!user) return NextResponse.json({ error: "Choose a valid seeded user." }, { status: 400 });
  const response = NextResponse.json({ user });
  response.cookies.set("ajaia_user", user.id, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("ajaia_user", "", { httpOnly: true, sameSite: "lax", maxAge: 0, path: "/" });
  return response;
}
