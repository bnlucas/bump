import { redirect } from "next/navigation";
import Link from "next/link";
import { ScreenHeader } from "@/components/screen-header";
import { currentSession } from "@/lib/auth/session";
import { loadCandidates } from "@/lib/match";
import { listConsents } from "@/lib/consents";
import { readActiveContext } from "@/lib/context";
import { SwipeDeck } from "./swipe-deck";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const session = await currentSession();
  if (!session) redirect("/auth");

  const granted = await listConsents(session.externalId);
  const grantedKeys = granted.map((c) => c.consent_type);

  if (grantedKeys.length === 0) {
    return (
      <>
        <ScreenHeader title="Discover" />
        <section className="px-4 py-10 text-center">
          <p className="mb-4 text-sm text-[color:var(--muted-foreground)]">
            Discover is contextual. Grant a consent layer in your profile to
            start matching.
          </p>
          <Link
            href="/profile"
            className="inline-block rounded-full bg-[color:var(--accent)] px-5 py-2.5 text-sm font-semibold text-[color:var(--accent-foreground)]"
          >
            Open profile
          </Link>
        </section>
      </>
    );
  }

  const cookie = await readActiveContext();
  const activeContext = cookie && grantedKeys.includes(cookie) ? cookie : grantedKeys[0];

  const candidates = await loadCandidates(session.externalId, activeContext);

  return (
    <>
      <ScreenHeader title="Discover" subtitle={`Context: ${activeContext}`} />
      <SwipeDeck
        initial={candidates}
        contexts={grantedKeys}
        activeContext={activeContext}
      />
    </>
  );
}
