import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { createDocument, listDocuments, listUsers } from "@/lib/db";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    return NextResponse.json({ documents: await listDocuments(user.id), users: await listUsers(), user });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Database unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const body = await request.json();
    if (!body.title?.trim()) return NextResponse.json({ error: "A title is required." }, { status: 400 });
    return NextResponse.json(await createDocument(body.title.trim(), body.content ?? "<p>Start writing here...</p>", user.id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Database unavailable." }, { status: 503 });
  }
}
