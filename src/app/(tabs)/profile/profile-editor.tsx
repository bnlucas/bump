"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/profile";

export function ProfileEditor({ initial }: { initial: Profile }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.display_name ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [signingOut, startSignOut] = useTransition();

  const dirty =
    displayName !== (initial.display_name ?? "") ||
    bio !== (initial.bio ?? "");

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("idle");
    startSave(async () => {
      const res = await fetch("/api/profile/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName, bio }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus("error");
        setError(data?.error ?? `Save failed (${res.status}).`);
        return;
      }
      setStatus("saved");
      router.refresh();
    });
  }

  function signOut() {
    startSignOut(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/auth");
      router.refresh();
    });
  }

  return (
    <section className="space-y-6 px-4 py-6">
      <form onSubmit={save} className="space-y-4">
        <Field label="Display name">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={80}
            className={inputCls}
          />
        </Field>
        <Field label="Bio">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={4}
            className={`${inputCls} resize-none`}
          />
          <span className="mt-1 block text-right text-xs text-[color:var(--muted-foreground)]">
            {bio.length}/500
          </span>
        </Field>

        {status === "saved" ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">Saved.</p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving || !dirty}
          className="w-full rounded-full bg-[color:var(--accent)] py-3 font-semibold text-[color:var(--accent-foreground)] transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>

      <hr className="border-[color:var(--border)]" />

      <dl className="space-y-2 text-sm">
        <Row label="External ID" value={initial.external_id} mono />
        <Row label="Cluster" value={initial.cluster_id ?? "—"} />
      </dl>

      <button
        type="button"
        onClick={signOut}
        disabled={signingOut}
        className="w-full rounded-full border border-[color:var(--border)] py-3 font-medium text-[color:var(--muted-foreground)] transition-colors hover:text-[color:var(--foreground)]"
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[color:var(--muted-foreground)]">{label}</dt>
      <dd className={mono ? "font-mono text-xs break-all" : ""}>{value}</dd>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-3 text-base outline-none focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/30";
