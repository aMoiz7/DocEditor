import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { importAttachment } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) {
  const user = await currentUser(); const { id } = await context.params;
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const form = await request.formData(); const file = form.get("file");
  if (!(file instanceof File) || !/\.(txt|md)$/i.test(file.name)) return NextResponse.json({ error: "Only .txt and .md files are supported." }, { status: 400 });
  if (file.size > 2_000_000) return NextResponse.json({ error: "Files must be smaller than 2 MB." }, { status: 400 });
  const doc = await importAttachment(id, user.id, { filename: file.name, mimeType: file.type || "text/plain", size: file.size, content: await file.text() });
  return doc ? NextResponse.json(doc) : NextResponse.json({ error: "Document not found or access denied." }, { status: 404 });
}
