import { NextResponse, type NextRequest } from "next/server";
import { requireSession, isUnauthorized } from "@/lib/auth/guard";
import { createPost, listPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const posts = await listPosts();
  return NextResponse.json({ posts });
}

interface PostBody {
  title: string;
  body: string;
}

function parseBody(value: unknown): PostBody | { error: string } {
  if (!value || typeof value !== "object") return { error: "Body must be a JSON object." };
  const v = value as Record<string, unknown>;
  if (typeof v.title !== "string" || !v.title.trim()) return { error: "Title is required." };
  if (typeof v.body !== "string" || !v.body.trim()) return { error: "Write something." };
  if (v.title.length > 200) return { error: "Title is too long." };
  if (v.body.length > 4000) return { error: "Post is too long." };
  return { title: v.title.trim(), body: v.body.trim() };
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const json = await request.json().catch(() => null);
  const parsed = parseBody(json);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const post = await createPost(session.externalId, parsed.title, parsed.body);
  if (!post) {
    return NextResponse.json({ error: "Couldn't post." }, { status: 502 });
  }
  return NextResponse.json({ post }, { status: 201 });
}
