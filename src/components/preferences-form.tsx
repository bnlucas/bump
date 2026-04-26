"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MatchPreferences } from "@/lib/match-preferences";

const inputCls =
  "w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-3 text-base outline-none focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/30";

function csv(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function PreferencesForm({ initial }: { initial: MatchPreferences }) {
  const router = useRouter();
  const [accept, setAccept] = useState(initial.accept_matches ?? true);
  const [ageMin, setAgeMin] = useState(initial.age_min?.toString() ?? "");
  const [ageMax, setAgeMax] = useState(initial.age_max?.toString() ?? "");
  const [gender, setGender] = useState(initial.gender ?? "");
  const [preferredGenders, setPreferredGenders] = useState(
    (initial.preferred_genders ?? []).join(", "),
  );
  const [location, setLocation] = useState(initial.location ?? "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("idle");
    setBusy(true);
    try {
      const body: MatchPreferences = {
        accept_matches: accept,
      };
      const min = ageMin.trim() ? Number(ageMin) : NaN;
      const max = ageMax.trim() ? Number(ageMax) : NaN;
      if (!Number.isNaN(min)) body.age_min = min;
      if (!Number.isNaN(max)) body.age_max = max;
      if (gender.trim()) body.gender = gender.trim();
      if (location.trim()) body.location = location.trim();
      const list = csv(preferredGenders);
      if (list.length > 0) body.preferred_genders = list;

      const res = await fetch("/api/profile/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? `Save failed (${res.status}).`);
        return;
      }
      setStatus("saved");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <label className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] px-4 py-3">
        <span>
          <span className="block text-sm font-medium">Open to matches</span>
          <span className="block text-xs text-[color:var(--muted-foreground)]">
            Turn this off to pause your profile.
          </span>
        </span>
        <input
          type="checkbox"
          checked={accept}
          onChange={(e) => setAccept(e.target.checked)}
          className="h-5 w-5"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Age min">
          <input
            type="number"
            min={18}
            max={120}
            inputMode="numeric"
            value={ageMin}
            onChange={(e) => setAgeMin(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Age max">
          <input
            type="number"
            min={18}
            max={120}
            inputMode="numeric"
            value={ageMax}
            onChange={(e) => setAgeMax(e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="You are">
        <input
          type="text"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          placeholder="e.g. woman, man, nonbinary"
          maxLength={64}
          className={inputCls}
        />
      </Field>

      <Field label="Looking for">
        <input
          type="text"
          value={preferredGenders}
          onChange={(e) => setPreferredGenders(e.target.value)}
          placeholder="comma-separated"
          maxLength={256}
          className={inputCls}
        />
      </Field>

      <Field label="Where you are">
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="city, region"
          maxLength={128}
          className={inputCls}
        />
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
        disabled={busy}
        className="w-full rounded-full bg-[color:var(--accent)] py-3 font-semibold text-[color:var(--accent-foreground)] disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save"}
      </button>
    </form>
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
