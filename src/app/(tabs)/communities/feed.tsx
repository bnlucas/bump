"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PostView } from "@/lib/posts";
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

  // Per-card local state: vocab post id -> engagement id (when liked this session).
  const [likedByPost, setLikedByPost] = useState<Map<string, string>>(() => new Map());
  const [likeBusy, setLikeBusy] = useState<string | null>(null);
  const [likeDelta, setLikeDelta] = useState<Map<string, number>>(() => new Map());

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

  async function toggleLike(post: PostView) {
    setLikeBusy(post.id);
    try {
      const liked = likedByPost.get(post.id);
      if (liked) {
        const res = await fetch(
          `/api/communities/posts/${encodeURIComponent(post.id)}/like/${encodeURIComponent(liked)}`,
          { method: "DELETE" },
        );
        if (!res.ok) return;
        setLikedByPost((m) => {
          const next = new Map(m);
          next.delete(post.id);
          return next;
        });
        setLikeDelta((d) => {
          const next = new Map(d);
          next.set(post.id, (next.get(post.id) ?? 0) - 1);
          return next;
        });
      } else {
        const res = await fetch(`/api/communities/posts/${encodeURIComponent(post.id)}/like`, {
          method: "POST",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { engagement_id: string };
        setLikedByPost((m) => {
          const next = new Map(m);
          next.set(post.id, data.engagement_id);
          return next;
        });
        setLikeDelta((d) => {
          const next = new Map(d);
          next.set(post.id, (next.get(post.id) ?? 0) + 1);
          return next;
        });
      }
    } finally {
      setLikeBusy(null);
    }
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
          {posts.map((p) => {
            const liked = likedByPost.has(p.id);
            const count = p.engagements_count + (likeDelta.get(p.id) ?? 0);
            return (
              <li
                key={p.id}
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] p-4 shadow-sm"
              >
                <p className="text-xs text-[color:var(--muted-foreground)]">
                  {p.author_name ?? "Someone"}
                  {p.published_at
                    ? ` · ${new Date(p.published_at).toLocaleDateString()}`
                    : null}
                </p>
                <h2 className="mt-1 text-base font-semibold tracking-tight">
                  {p.title}
                </h2>
                <p className="mt-2 whitespace-pre-line text-sm">{p.body}</p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleLike(p)}
                    disabled={likeBusy === p.id}
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
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
