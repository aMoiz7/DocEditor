import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listVersions } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };
export async function GET(_: Request, context: Context) {
  const user = await currentUser();
  const { id } = await context.params;
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json({ versions: await listVersions(id, user.id) });
}
