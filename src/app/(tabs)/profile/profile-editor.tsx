"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/profile";
import type { ConsentDto, ConsentLayerDto } from "@/lib/consents";
import type { ClientTagDto, ClientTopicDto } from "@/lib/vocab";
import type { AffinityTagDto } from "@/lib/affinity-tags";
import type { AffinityTopicDto } from "@/lib/affinity-topics";
import type {
  ClientAffinityPreferenceDto,
  ClientAffinityRoleDto,
} from "@/lib/affinity-config";
import { cn } from "@/lib/cn";

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
}: {
  initial: Profile;
  initialConsents: ConsentDto[];
  consentLayers: ConsentLayerDto[];
  vocab: ClientTagDto[];
  topicVocab: ClientTopicDto[];
  preferences: ClientAffinityPreferenceDto[];
  roles: ClientAffinityRoleDto[];
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.display_name ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [consents, setConsents] = useState(initialConsents);
  const [consentBusy, setConsentBusy] = useState<string | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [attachedByTagId, setAttachedByTagId] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [tagBusy, setTagBusy] = useState<string | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);
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
        preferences.find((p) => p.id === topicDraft.preference_id)?.key ?? topicDraft.preference_id;
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

  async function toggleTag(tag: ClientTagDto) {
    setTagError(null);
    setTagBusy(tag.id);
    try {
      const attachedId = attachedByTagId.get(tag.id);
      if (attachedId) {
        const res = await fetch(
          `/api/profile/affinity-tags/${encodeURIComponent(attachedId)}`,
          { method: "DELETE" },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setTagError(data?.error ?? `Remove failed (${res.status}).`);
          return;
        }
        setAttachedByTagId((m) => {
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
          setTagError(data?.error ?? `Add failed (${res.status}).`);
          return;
        }
        const data = (await res.json()) as { tag: AffinityTagDto };
        setAttachedByTagId((m) => {
          const next = new Map(m);
          next.set(tag.id, data.tag.id);
          return next;
        });
      }
    } finally {
      setTagBusy(null);
    }
  }

  async function toggleConsent(layer: ConsentLayerDto, grant: ConsentDto | undefined) {
    setConsentError(null);
    setConsentBusy(layer.key);
    try {
      if (grant) {
        const res = await fetch(`/api/profile/consents/${encodeURIComponent(grant.id)}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setConsentError(data?.error ?? `Revoke failed (${res.status}).`);
          return;
        }
        setConsents((cs) => cs.filter((c) => c.id !== grant.id));
      } else {
        const res = await fetch("/api/profile/consents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consent_type: layer.key }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setConsentError(data?.error ?? `Grant failed (${res.status}).`);
          return;
        }
        const data = (await res.json()) as { consent: ConsentDto };
        setConsents((cs) => [...cs, data.consent]);
      }
      router.refresh();
    } finally {
      setConsentBusy(null);
    }
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

      <div>
        <h2 className="mb-1 text-sm font-semibold">Consent</h2>
        <p className="mb-3 text-xs text-[color:var(--muted-foreground)]">
          Each consent layer is a context (e.g. dating, friendship) for which
          you allow Simbee to compute matches and let others reach out.
        </p>
        {consentLayers.length === 0 ? (
          <p className="text-sm text-[color:var(--muted-foreground)]">
            No consent layers configured for this tenant.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--border)] rounded-2xl border border-[color:var(--border)]">
            {consentLayers.map((layer) => {
              const grant = consents.find((c) => c.consent_type === layer.key);
              const granted = Boolean(grant);
              return (
                <li
                  key={layer.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{layer.key}</p>
                    {grant ? (
                      <p className="font-mono text-[10px] text-[color:var(--muted-foreground)]">
                        granted {new Date(grant.granted_at).toLocaleDateString()}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={consentBusy === layer.key}
                    onClick={() => toggleConsent(layer, grant)}
                    className={
                      granted
                        ? "rounded-full border border-[color:var(--border)] px-4 py-1.5 text-xs font-medium text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] disabled:opacity-50"
                        : "rounded-full bg-[color:var(--accent)] px-4 py-1.5 text-xs font-semibold text-[color:var(--accent-foreground)] disabled:opacity-50"
                    }
                  >
                    {consentBusy === layer.key
                      ? "…"
                      : granted
                        ? "Revoke"
                        : "Grant"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {consentError ? (
          <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
            {consentError}
          </p>
        ) : null}
      </div>

      <hr className="border-[color:var(--border)]" />

      <div>
        <h2 className="mb-1 text-sm font-semibold">Interests</h2>
        <p className="mb-3 text-xs text-[color:var(--muted-foreground)]">
          Tap to add tags from your tenant&rsquo;s vocabulary. Simbee uses these
          to score who you&rsquo;ll see in Discover.
        </p>
        {vocab.length === 0 ? (
          <p className="text-sm text-[color:var(--muted-foreground)]">
            No vocabulary tags configured for this tenant.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {vocab.map((tag) => {
              const attached = attachedByTagId.has(tag.id);
              const busy = tagBusy === tag.id;
              return (
                <li key={tag.id}>
                  <button
                    type="button"
                    onClick={() => toggleTag(tag)}
                    disabled={busy}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                      attached
                        ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-foreground)]"
                        : "border-[color:var(--border)] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]",
                    )}
                  >
                    {busy ? "…" : tag.name}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {tagError ? (
          <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
            {tagError}
          </p>
        ) : null}
      </div>

      <hr className="border-[color:var(--border)]" />

      <div>
        <h2 className="mb-1 text-sm font-semibold">Topics</h2>
        <p className="mb-3 text-xs text-[color:var(--muted-foreground)]">
          Topics with a preference and role drive Simbee&rsquo;s compatibility
          scoring — e.g. {`"into climbing as receiver"`} matches well with
          {` "into climbing as giver"`}.
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
            Topics need both a vocabulary and at least one configured affinity
            preference. Ask your tenant admin to provision them.
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
