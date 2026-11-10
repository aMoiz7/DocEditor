import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { deleteDocument } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };
export async function DELETE(_: Request, context: Context) {
  const user = await currentUser();
  const { id } = await context.params;
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const deleted = await deleteDocument(id, user.id);
  return deleted ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Only the owner can delete this document." }, { status: 403 });
}
