"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ConsentDto, ConsentLayerDto } from "@/lib/consents";

export function ConsentList({
  initial,
  layers,
  onChange,
}: {
  initial: ConsentDto[];
  layers: ConsentLayerDto[];
  onChange?: (granted: ConsentDto[]) => void;
}) {
  const router = useRouter();
  const [granted, setGranted] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function publish(next: ConsentDto[]) {
    setGranted(next);
    onChange?.(next);
  }

  async function toggle(layer: ConsentLayerDto, grant: ConsentDto | undefined) {
    setError(null);
    setBusy(layer.key);
    try {
      if (grant) {
        const res = await fetch(`/api/profile/consents/${encodeURIComponent(grant.id)}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error ?? `Couldn't turn off (${res.status}).`);
          return;
        }
        publish(granted.filter((c) => c.id !== grant.id));
      } else {
        const res = await fetch("/api/profile/consents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consent_type: layer.key }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error ?? `Couldn't turn on (${res.status}).`);
          return;
        }
        const data = (await res.json()) as { consent: ConsentDto };
        publish([...granted, data.consent]);
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (layers.length === 0) {
    return (
      <p className="text-sm text-[color:var(--muted-foreground)]">Nothing available yet.</p>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-[color:var(--border)] rounded-2xl border border-[color:var(--border)]">
        {layers.map((layer) => {
          const grant = granted.find((c) => c.consent_type === layer.key);
          const on = Boolean(grant);
          const pending = busy === layer.key;
          return (
            <li
              key={layer.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <p className="font-medium">{layer.key}</p>
              <button
                type="button"
                disabled={pending}
                onClick={() => toggle(layer, grant)}
                className={
                  on
                    ? "rounded-full border border-[color:var(--border)] px-4 py-1.5 text-xs font-medium text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] disabled:opacity-50"
                    : "rounded-full bg-[color:var(--accent)] px-4 py-1.5 text-xs font-semibold text-[color:var(--accent-foreground)] disabled:opacity-50"
                }
              >
                {pending ? "…" : on ? "Turn off" : "Turn on"}
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
