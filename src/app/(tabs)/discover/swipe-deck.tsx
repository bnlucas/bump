"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Candidate } from "@/lib/match";
import { cn } from "@/lib/cn";

export function SwipeDeck({
  initial,
  contexts,
  activeContext,
}: {
  initial: Candidate[];
  contexts: string[];
  activeContext: string;
}) {
  const router = useRouter();
  const [queue, setQueue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [switching, startSwitch] = useTransition();
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

  function switchContext(next: string) {
    if (next === activeContext || switching) return;
    startSwitch(async () => {
      const res = await fetch("/api/discover/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? `Couldn't switch context (${res.status}).`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-4 px-4 py-4">
      {contexts.length > 1 ? (
        <nav
          aria-label="Discovery context"
          className="flex gap-2 overflow-x-auto pb-1"
        >
          {contexts.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => switchContext(c)}
              disabled={switching}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                c === activeContext
                  ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-foreground)]"
                  : "border-[color:var(--border)] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]",
              )}
            >
              {c}
            </button>
          ))}
        </nav>
      ) : null}

      {!top ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-center text-[color:var(--muted-foreground)]">
          <p className="text-sm">No one new for now. Check back soon.</p>
        </div>
      ) : (
        <>
          <article className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--muted)] p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight">
              {top.display_name ?? "Someone interesting"}
            </h2>
            {top.bio ? (
              <p className="mt-3 whitespace-pre-line text-sm">{top.bio}</p>
            ) : null}
            {top.explanation.length > 0 ? (
              <ul className="mt-4 space-y-1 text-xs text-[color:var(--muted-foreground)]">
                {top.explanation.slice(0, 3).map((e, i) => (
                  <li key={i}>{e}</li>
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

          {queue.length > 1 ? (
            <p className="text-center text-xs text-[color:var(--muted-foreground)]">
              {queue.length - 1} more
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
