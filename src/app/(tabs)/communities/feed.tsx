"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PostView, CommentView } from "@/lib/posts";
import { cn } from "@/lib/cn";

export function CommunityFeed({
  initial,
  userId,
}: {
  initial: PostView[];
  userId: string;
}) {
  void userId;
  const router = useRouter();
  const [posts, setPosts] = useState(initial);
  const [composeOpen, setComposeOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [composeError, setComposeError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setComposeError(null);
    if (!title.trim() || !body.trim()) {
      setComposeError("Add a title and a body.");
      return;
    }
    startSubmit(async () => {
      const res = await fetch("/api/communities/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setComposeError(data?.error ?? `Couldn't post (${res.status}).`);
        return;
      }
      const data = (await res.json()) as { post: PostView };
      setPosts((p) => [data.post, ...p]);
      setTitle("");
      setBody("");
      setComposeOpen(false);
      router.refresh();
    });
  }

  return (
    <section className="px-4 py-4">
      {composeOpen ? (
        <form
          onSubmit={submit}
          className="mb-6 space-y-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4"
        >
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-base font-semibold outline-none focus:border-[color:var(--accent)]"
          />
          <textarea
            placeholder="What's on your mind?"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={4000}
            rows={5}
            className="w-full resize-none rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm outline-none focus:border-[color:var(--accent)]"
          />
          {composeError ? (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {composeError}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setComposeOpen(false);
                setComposeError(null);
              }}
              className="flex-1 rounded-full border border-[color:var(--border)] py-2 text-sm font-medium text-[color:var(--muted-foreground)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !body.trim()}
              className="flex-1 rounded-full bg-[color:var(--accent)] py-2 text-sm font-semibold text-[color:var(--accent-foreground)] disabled:opacity-50"
            >
              {submitting ? "Posting…" : "Post"}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setComposeOpen(true)}
          className="mb-6 w-full rounded-full bg-[color:var(--accent)] py-3 font-semibold text-[color:var(--accent-foreground)]"
        >
          Start a thread
        </button>
      )}

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-center text-[color:var(--muted-foreground)]">
          <p className="text-sm">Nothing here yet. Be the first.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </ul>
      )}
    </section>
  );
}

function PostCard({ post }: { post: PostView }) {
  const [likedEngagementId, setLikedEngagementId] = useState<string | null>(null);
  const [likeDelta, setLikeDelta] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<CommentView[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentSending, setCommentSending] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const liked = likedEngagementId !== null;
  const count = post.engagements_count + likeDelta;

  async function toggleLike() {
    setLikeBusy(true);
    try {
      if (likedEngagementId) {
        const res = await fetch(
          `/api/communities/posts/${encodeURIComponent(post.id)}/like/${encodeURIComponent(likedEngagementId)}`,
          { method: "DELETE" },
        );
        if (!res.ok) return;
        setLikedEngagementId(null);
        setLikeDelta((d) => d - 1);
      } else {
        const res = await fetch(
          `/api/communities/posts/${encodeURIComponent(post.id)}/like`,
          { method: "POST" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { engagement_id: string };
        setLikedEngagementId(data.engagement_id);
        setLikeDelta((d) => d + 1);
      }
    } finally {
      setLikeBusy(false);
    }
  }

  async function openComments() {
    if (commentsOpen) {
      setCommentsOpen(false);
      return;
    }
    setCommentsOpen(true);
    if (commentsLoaded) return;
    setCommentsLoading(true);
    try {
      const res = await fetch(
        `/api/communities/comments?post=${encodeURIComponent(post.external_id)}`,
      );
      if (res.ok) {
        const data = (await res.json()) as { comments: CommentView[] };
        setComments(data.comments);
      }
      setCommentsLoaded(true);
    } finally {
      setCommentsLoading(false);
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    setCommentError(null);
    const text = commentText.trim();
    if (!text || commentSending) return;
    setCommentSending(true);
    try {
      const res = await fetch("/api/communities/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_external_id: post.external_id,
          body: text,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCommentError(data?.error ?? `Couldn't post (${res.status}).`);
        return;
      }
      const data = (await res.json()) as { comment: CommentView };
      setComments((cs) => [...cs, data.comment]);
      setCommentText("");
    } finally {
      setCommentSending(false);
    }
  }

  return (
    <li className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] p-4 shadow-sm">
      <p className="text-xs text-[color:var(--muted-foreground)]">
        {post.author_name ?? "Someone"}
        {post.published_at
          ? ` · ${new Date(post.published_at).toLocaleDateString()}`
          : null}
      </p>
      <h2 className="mt-1 text-base font-semibold tracking-tight">{post.title}</h2>
      <p className="mt-2 whitespace-pre-line text-sm">{post.body}</p>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleLike}
          disabled={likeBusy}
          aria-pressed={liked}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50",
            liked
              ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-foreground)]"
              : "border-[color:var(--border)] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]",
          )}
        >
          {liked ? "♥" : "♡"} {Math.max(count, 0)}
        </button>
        <button
          type="button"
          onClick={openComments}
          className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-medium text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
        >
          {commentsOpen ? "Hide replies" : "Replies"}
          {comments.length > 0 ? ` (${comments.length})` : null}
        </button>
      </div>

      {commentsOpen ? (
        <div className="mt-3 space-y-3 border-t border-[color:var(--border)] pt-3">
          {commentsLoading ? (
            <p className="text-xs text-[color:var(--muted-foreground)]">Loading…</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-[color:var(--muted-foreground)]">
              No replies yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {comments.map((c) => (
                <li key={c.id} className="rounded-xl bg-[color:var(--muted)] px-3 py-2">
                  <p className="text-[11px] text-[color:var(--muted-foreground)]">
                    {c.author_name ?? "Someone"} ·{" "}
                    {new Date(c.created_at).toLocaleString()}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm">{c.body}</p>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={submitComment} className="space-y-2">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a reply"
              rows={2}
              maxLength={2000}
              className="w-full resize-none rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm outline-none focus:border-[color:var(--accent)]"
            />
            {commentError ? (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                {commentError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={!commentText.trim() || commentSending}
              className="rounded-full bg-[color:var(--accent)] px-4 py-1.5 text-xs font-semibold text-[color:var(--accent-foreground)] disabled:opacity-50"
            >
              {commentSending ? "Posting…" : "Reply"}
            </button>
          </form>
        </div>
      ) : null}
    </li>
  );
}
