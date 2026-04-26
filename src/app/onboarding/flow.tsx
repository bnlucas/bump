"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ConsentDto, ConsentLayerDto } from "@/lib/consents";
import type { ClientTagDto } from "@/lib/vocab";
import { PhotoGrid } from "@/components/photo-grid";
import { ConsentList } from "@/components/consent-list";
import { InterestChips } from "@/components/interest-chips";

export function OnboardingFlow({
  initialDisplayName,
  initialPhotoIds,
  initialConsents,
  consentLayers,
  vocab,
}: {
  initialDisplayName: string;
  initialPhotoIds: string[];
  initialConsents: ConsentDto[];
  consentLayers: ConsentLayerDto[];
  vocab: ClientTagDto[];
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [grantedCount, setGrantedCount] = useState(initialConsents.length);
  const [error, setError] = useState<string | null>(null);
  const [finishing, startFinish] = useTransition();

  const ready = displayName.trim().length > 0 && grantedCount > 0;

  function finish() {
    setError(null);
    if (!ready) return;
    startFinish(async () => {
      if (displayName.trim() !== initialDisplayName.trim()) {
        const res = await fetch("/api/profile/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ display_name: displayName.trim() }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error ?? `Couldn't save your name (${res.status}).`);
          return;
        }
      }
      router.replace("/discover");
      router.refresh();
    });
  }

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-screen-sm flex-col gap-8 px-6 pb-24"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 2rem)" }}
    >
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Welcome</h1>
        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
          A couple of things and you&rsquo;re in.
        </p>
      </header>

      <Section
        title="Add a photo"
        subtitle="Your first photo is what people see in Discover."
      >
        <PhotoGrid initial={initialPhotoIds} max={6} />
      </Section>

      <Section
        title="Your name"
        subtitle="What people see at the top of your card."
      >
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={80}
          autoComplete="nickname"
          placeholder="Your name"
          className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-3 text-base outline-none focus:border-[color:var(--accent)]"
        />
      </Section>

      <Section
        title="What you're here for"
        subtitle="Pick at least one. You can change this any time in your profile."
      >
        <ConsentList
          initial={initialConsents}
          layers={consentLayers}
          onChange={(granted) => setGrantedCount(granted.length)}
        />
      </Section>

      <Section
        title="What you're into"
        subtitle="Optional, but the more you tap the better the people you'll see."
      >
        <InterestChips vocab={vocab} />
      </Section>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <div
        className="sticky bottom-0 -mx-6 mt-auto border-t border-[color:var(--border)] bg-[color:var(--background)]/95 px-6 py-4 backdrop-blur"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        <button
          type="button"
          onClick={finish}
          disabled={!ready || finishing}
          className="w-full rounded-full bg-[color:var(--accent)] py-3 font-semibold text-[color:var(--accent-foreground)] disabled:opacity-40"
        >
          {finishing ? "…" : "Start"}
        </button>
        {!ready ? (
          <p className="mt-2 text-center text-xs text-[color:var(--muted-foreground)]">
            Add your name and pick at least one space.
          </p>
        ) : null}
      </div>
    </main>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {subtitle ? (
        <p className="mb-3 mt-1 text-xs text-[color:var(--muted-foreground)]">
          {subtitle}
        </p>
      ) : (
        <div className="mb-3" />
      )}
      {children}
    </section>
  );
}
