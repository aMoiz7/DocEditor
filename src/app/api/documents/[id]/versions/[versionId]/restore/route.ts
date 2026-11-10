import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { restoreVersion } from "@/lib/db";

type Context = { params: Promise<{ id: string; versionId: string }> };
export async function POST(_: Request, context: Context) {
  const user = await currentUser();
  const { id, versionId } = await context.params;
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const document = await restoreVersion(id, versionId, user.id);
  return document ? NextResponse.json(document) : NextResponse.json({ error: "Only the owner can restore this version." }, { status: 403 });
}
