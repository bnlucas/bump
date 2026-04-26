import { NextResponse, type NextRequest } from "next/server";
import { requireSession, isUnauthorized } from "@/lib/auth/guard";
import { createPost, listPosts, type CreatePostInput } from "@/lib/posts";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const posts = await listPosts(session.externalId);
  return NextResponse.json({ posts });
}

function parseBody(value: unknown): CreatePostInput | { error: string } {
  if (!value || typeof value !== "object") return { error: "Body must be a JSON object." };
  const v = value as Record<string, unknown>;
  if (typeof v.title !== "string" || !v.title.trim()) return { error: "Title is required." };
  if (typeof v.body !== "string" || !v.body.trim()) return { error: "Write something." };
  if (v.title.length > 200) return { error: "Title is too long." };
  if (v.body.length > 4000) return { error: "Post is too long." };

  const out: CreatePostInput = { title: v.title.trim(), body: v.body.trim() };
  if (typeof v.layer_key === "string" && v.layer_key) out.layer_key = v.layer_key;
  if (typeof v.topic_id === "string" && v.topic_id) out.topic_id = v.topic_id;
  if (typeof v.topic_name === "string" && v.topic_name) out.topic_name = v.topic_name;
  return out;
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const json = await request.json().catch(() => null);
  const parsed = parseBody(json);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const post = await createPost(session.externalId, parsed);
  if (!post) {
    return NextResponse.json({ error: "Couldn't post." }, { status: 502 });
  }
  return NextResponse.json({ post }, { status: 201 });
}
