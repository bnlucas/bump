import { redirect } from "next/navigation";
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

  if (grantedKeys.length === 0) redirect("/onboarding");

  const cookie = await readActiveContext();
  const activeContext = cookie && grantedKeys.includes(cookie) ? cookie : grantedKeys[0];

  const candidates = await loadCandidates(session.externalId, activeContext);

  return (
    <>
      <ScreenHeader title="Discover" />
      <SwipeDeck
        initial={candidates}
        contexts={grantedKeys}
        activeContext={activeContext}
      />
    </>
  );
}
