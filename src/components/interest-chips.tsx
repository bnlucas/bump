"use client";

import { useState } from "react";
import type { ClientTagDto } from "@/lib/vocab";
import type { AffinityTagDto } from "@/lib/affinity-tags";
import { cn } from "@/lib/cn";

export function InterestChips({ vocab }: { vocab: ClientTagDto[] }) {
  const [attached, setAttached] = useState<Map<string, string>>(() => new Map());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(tag: ClientTagDto) {
    setError(null);
    setBusy(tag.id);
    try {
      const existing = attached.get(tag.id);
      if (existing) {
        const res = await fetch(
          `/api/profile/affinity-tags/${encodeURIComponent(existing)}`,
          { method: "DELETE" },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error ?? `Remove failed (${res.status}).`);
          return;
        }
        setAttached((m) => {
          const next = new Map(m);
          next.delete(tag.id);
          return next;
        });
      } else {
        const res = await fetch("/api/profile/affinity-tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tag_id: tag.id, tag_type: "client" }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error ?? `Add failed (${res.status}).`);
          return;
        }
        const data = (await res.json()) as { tag: AffinityTagDto };
        setAttached((m) => {
          const next = new Map(m);
          next.set(tag.id, data.tag.id);
          return next;
        });
      }
    } finally {
      setBusy(null);
    }
  }

  if (vocab.length === 0) {
    return (
      <p className="text-sm text-[color:var(--muted-foreground)]">Nothing here yet.</p>
    );
  }

  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        {vocab.map((tag) => {
          const on = attached.has(tag.id);
          const pending = busy === tag.id;
          return (
            <li key={tag.id}>
              <button
                type="button"
                onClick={() => toggle(tag)}
                disabled={pending}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                  on
                    ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-foreground)]"
                    : "border-[color:var(--border)] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]",
                )}
              >
                {pending ? "…" : tag.name}
              </button>
            </li>
          );
        })}
      </ul>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
