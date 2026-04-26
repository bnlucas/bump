import { NextResponse, type NextRequest } from "next/server";
import { requireSession, isUnauthorized } from "@/lib/auth/guard";
import { createComment, listComments } from "@/lib/posts";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const post = request.nextUrl.searchParams.get("post");
  if (!post) return NextResponse.json({ error: "post required." }, { status: 400 });

  const comments = await listComments(post);
  return NextResponse.json({ comments });
}

interface CommentBody {
  post_external_id: string;
  body: string;
}

function parseBody(value: unknown): CommentBody | { error: string } {
  if (!value || typeof value !== "object") return { error: "Body must be a JSON object." };
  const v = value as Record<string, unknown>;
  if (typeof v.post_external_id !== "string" || !v.post_external_id) {
    return { error: "post_external_id required." };
  }
  if (typeof v.body !== "string" || !v.body.trim()) return { error: "Write something." };
  if (v.body.length > 2000) return { error: "Comment is too long." };
  return { post_external_id: v.post_external_id, body: v.body.trim() };
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const json = await request.json().catch(() => null);
  const parsed = parseBody(json);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const comment = await createComment(
    session.externalId,
    parsed.post_external_id,
    parsed.body,
  );
  if (!comment) {
    return NextResponse.json({ error: "Couldn't post comment." }, { status: 502 });
  }
  return NextResponse.json({ comment }, { status: 201 });
}
