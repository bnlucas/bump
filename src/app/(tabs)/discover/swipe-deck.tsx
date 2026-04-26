"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Candidate } from "@/lib/match";

export function SwipeDeck({ initial }: { initial: Candidate[] }) {
  const router = useRouter();
  const [queue, setQueue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const top = queue[0];

  function swipe(direction: "right" | "left") {
    if (!top) return;
    setError(null);
    const target = top;
    setQueue((q) => q.slice(1));

    start(async () => {
      const res = await fetch("/api/discover/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_id: target.external_id, direction }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? `Swipe failed (${res.status}).`);
        setQueue((q) => [target, ...q]);
        return;
      }
      const data = (await res.json()) as {
        stream_id: string | null;
        allowed: boolean;
        reason?: string;
      };
      if (direction === "right") {
        if (data.allowed && data.stream_id) {
          router.push(`/chat/${encodeURIComponent(data.stream_id)}`);
        } else if (!data.allowed) {
          setError(data.reason ?? "This connection isn't permitted right now.");
        }
      }
    });
  }

  if (!top) {
    return (
      <section className="px-4 py-10 text-center text-[color:var(--muted-foreground)]">
        <p className="text-sm">No candidates right now. Check back soon.</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6 px-4 py-6">
      <article className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--muted)] p-6 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            {top.display_name ?? "Someone interesting"}
          </h2>
          <span className="text-xs font-mono text-[color:var(--muted-foreground)]">
            {Math.round(top.score * 100)}%
          </span>
        </div>
        {top.bio ? (
          <p className="mt-3 whitespace-pre-line text-sm">{top.bio}</p>
        ) : (
          <p className="mt-3 text-sm italic text-[color:var(--muted-foreground)]">
            No bio yet.
          </p>
        )}
        {top.explanation.length > 0 ? (
          <ul className="mt-4 space-y-1 text-xs text-[color:var(--muted-foreground)]">
            {top.explanation.slice(0, 3).map((e, i) => (
              <li key={i}>· {e}</li>
            ))}
          </ul>
        ) : null}
      </article>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => swipe("left")}
          disabled={pending}
          className="rounded-full border border-[color:var(--border)] py-3 font-semibold text-[color:var(--muted-foreground)] transition-colors hover:text-[color:var(--foreground)] disabled:opacity-50"
        >
          Pass
        </button>
        <button
          type="button"
          onClick={() => swipe("right")}
          disabled={pending}
          className="rounded-full bg-[color:var(--accent)] py-3 font-semibold text-[color:var(--accent-foreground)] transition-opacity disabled:opacity-50"
        >
          Connect
        </button>
      </div>

      <p className="text-center text-xs text-[color:var(--muted-foreground)]">
        {queue.length - 1} more in queue
      </p>
    </section>
  );
}
