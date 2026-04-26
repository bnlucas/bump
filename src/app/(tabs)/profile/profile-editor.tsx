"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/profile";
import type { ConsentDto, ConsentLayerDto } from "@/lib/consents";
import type { ClientTagDto, ClientTopicDto } from "@/lib/vocab";
import type { AffinityTopicDto } from "@/lib/affinity-topics";
import type {
  ClientAffinityPreferenceDto,
  ClientAffinityRoleDto,
} from "@/lib/affinity-config";
import { PhotoGrid } from "@/components/photo-grid";
import { ConsentList } from "@/components/consent-list";
import { InterestChips } from "@/components/interest-chips";

interface TopicEntry extends AffinityTopicDto {
  topicName: string;
  preferenceKey: string;
  roleKey?: string;
}

export function ProfileEditor({
  initial,
  initialConsents,
  consentLayers,
  vocab,
  topicVocab,
  preferences,
  roles,
  initialPhotoIds,
}: {
  initial: Profile;
  initialConsents: ConsentDto[];
  consentLayers: ConsentLayerDto[];
  vocab: ClientTagDto[];
  topicVocab: ClientTopicDto[];
  preferences: ClientAffinityPreferenceDto[];
  roles: ClientAffinityRoleDto[];
  initialPhotoIds: string[];
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.display_name ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [signingOut, startSignOut] = useTransition();

  const [topicEntries, setTopicEntries] = useState<TopicEntry[]>([]);
  const [topicDraft, setTopicDraft] = useState({
    topic_id: "",
    preference_id: preferences[0]?.id ?? "",
    role_id: "",
    important: false,
    must_have: false,
  });
  const [topicBusy, setTopicBusy] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);

  const dirty =
    displayName !== (initial.display_name ?? "") || bio !== (initial.bio ?? "");

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

  async function addTopic(e: React.FormEvent) {
    e.preventDefault();
    setTopicError(null);
    if (!topicDraft.topic_id) {
      setTopicError("Pick a topic.");
      return;
    }
    if (!topicDraft.preference_id) {
      setTopicError("Pick a preference.");
      return;
    }
    setTopicBusy(true);
    try {
      const res = await fetch("/api/profile/affinity-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_id: topicDraft.topic_id,
          topic_type: "client",
          preference_id: topicDraft.preference_id,
          ...(topicDraft.role_id ? { role_id: topicDraft.role_id } : {}),
          ...(topicDraft.important ? { important: true } : {}),
          ...(topicDraft.must_have ? { must_have: true } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setTopicError(data?.error ?? `Add failed (${res.status}).`);
        return;
      }
      const data = (await res.json()) as { topic: AffinityTopicDto };
      const topicName =
        topicVocab.find((t) => t.id === topicDraft.topic_id)?.name ?? topicDraft.topic_id;
      const preferenceKey =
        preferences.find((p) => p.id === topicDraft.preference_id)?.key ??
        topicDraft.preference_id;
      const roleKey = topicDraft.role_id
        ? (roles.find((r) => r.id === topicDraft.role_id)?.key ?? topicDraft.role_id)
        : undefined;
      setTopicEntries((es) => [
        ...es,
        { ...data.topic, topicName, preferenceKey, roleKey },
      ]);
      setTopicDraft({
        topic_id: "",
        preference_id: preferences[0]?.id ?? "",
        role_id: "",
        important: false,
        must_have: false,
      });
    } finally {
      setTopicBusy(false);
    }
  }

  async function removeTopic(entry: TopicEntry) {
    setTopicError(null);
    setTopicBusy(true);
    try {
      const res = await fetch(
        `/api/profile/affinity-topics/${encodeURIComponent(entry.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setTopicError(data?.error ?? `Remove failed (${res.status}).`);
        return;
      }
      setTopicEntries((es) => es.filter((e) => e.id !== entry.id));
    } finally {
      setTopicBusy(false);
    }
  }

  return (
    <section className="space-y-6 px-4 py-6">
      <PhotoGrid initial={initialPhotoIds} />

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

      <div>
        <h2 className="mb-1 text-sm font-semibold">What you&rsquo;re here for</h2>
        <p className="mb-3 text-xs text-[color:var(--muted-foreground)]">
          Choose which spaces you want to be matched in. You can turn each on or
          off any time.
        </p>
        <ConsentList initial={initialConsents} layers={consentLayers} />
      </div>

      <hr className="border-[color:var(--border)]" />

      <div>
        <h2 className="mb-1 text-sm font-semibold">Interests</h2>
        <p className="mb-3 text-xs text-[color:var(--muted-foreground)]">
          Tap what you&rsquo;re into. The more you pick, the better the people
          you&rsquo;ll see.
        </p>
        <InterestChips vocab={vocab} />
      </div>

      <hr className="border-[color:var(--border)]" />

      <div>
        <h2 className="mb-1 text-sm font-semibold">What you bring &amp; what you want</h2>
        <p className="mb-3 text-xs text-[color:var(--muted-foreground)]">
          Add a thing you&rsquo;re into and how you show up around it. Pairs
          like &ldquo;into climbing — leading&rdquo; and &ldquo;into climbing —
          following&rdquo; find each other.
        </p>

        {topicEntries.length > 0 ? (
          <ul className="mb-4 divide-y divide-[color:var(--border)] rounded-2xl border border-[color:var(--border)]">
            {topicEntries.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">
                    <span className="font-medium">{t.topicName}</span>{" "}
                    <span className="text-[color:var(--muted-foreground)]">
                      · {t.preferenceKey}
                      {t.roleKey ? ` · role ${t.roleKey}` : ""}
                    </span>
                  </p>
                  {(t.important || t.must_have) ? (
                    <p className="mt-0.5 flex gap-2 text-[10px] uppercase tracking-wide text-[color:var(--muted-foreground)]">
                      {t.important ? <span>important</span> : null}
                      {t.must_have ? <span>must-have</span> : null}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => removeTopic(t)}
                  disabled={topicBusy}
                  className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] disabled:opacity-50"
                  aria-label={`Remove ${t.topicName}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {topicVocab.length === 0 || preferences.length === 0 ? (
          <p className="text-sm text-[color:var(--muted-foreground)]">
            Nothing to add yet — check back soon.
          </p>
        ) : (
          <form onSubmit={addTopic} className="space-y-3">
            <Field label="Topic">
              <select
                value={topicDraft.topic_id}
                onChange={(e) => setTopicDraft((d) => ({ ...d, topic_id: e.target.value }))}
                className={inputCls}
              >
                <option value="">Pick a topic…</option>
                {topicVocab.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Preference">
                <select
                  value={topicDraft.preference_id}
                  onChange={(e) =>
                    setTopicDraft((d) => ({ ...d, preference_id: e.target.value }))
                  }
                  className={inputCls}
                >
                  {preferences.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.key}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Role">
                <select
                  value={topicDraft.role_id}
                  onChange={(e) => setTopicDraft((d) => ({ ...d, role_id: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Any</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.key}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={topicDraft.important}
                  onChange={(e) =>
                    setTopicDraft((d) => ({ ...d, important: e.target.checked }))
                  }
                />
                Important
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={topicDraft.must_have}
                  onChange={(e) =>
                    setTopicDraft((d) => ({ ...d, must_have: e.target.checked }))
                  }
                />
                Must-have
              </label>
            </div>

            {topicError ? (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {topicError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={topicBusy || !topicDraft.topic_id || !topicDraft.preference_id}
              className="w-full rounded-full bg-[color:var(--accent)] py-2.5 text-sm font-semibold text-[color:var(--accent-foreground)] disabled:opacity-50"
            >
              {topicBusy ? "Adding…" : "Add topic"}
            </button>
          </form>
        )}
      </div>

      <hr className="border-[color:var(--border)]" />

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

const inputCls =
  "w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-3 text-base outline-none focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/30";
