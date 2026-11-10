import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getDocument, shareDocument, updateDocument } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };
export async function GET(_: Request, context: Context) {
  const user = await currentUser(); const { id } = await context.params;
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const doc = await getDocument(id, user.id);
  return doc ? NextResponse.json(doc) : NextResponse.json({ error: "Document not found or access denied." }, { status: 404 });
}
export async function PATCH(request: Request, context: Context) {
  const user = await currentUser(); const { id } = await context.params;
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await request.json();
  const doc = body.shareWith ? await shareDocument(id, user.id, body.shareWith) : await updateDocument(id, user.id, { title: body.title, content: body.content });
  return doc ? NextResponse.json(doc) : NextResponse.json({ error: "Document not found, access denied, or sharing requires ownership." }, { status: 403 });
}
