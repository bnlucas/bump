import { redirect } from "next/navigation";
import { ScreenHeader } from "@/components/screen-header";
import { currentSession } from "@/lib/auth/session";
import { loadCandidates } from "@/lib/match";
import { SwipeDeck } from "./swipe-deck";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const session = await currentSession();
  if (!session) redirect("/auth");

  const candidates = await loadCandidates(session.externalId);

  return (
    <>
      <ScreenHeader title="Discover" subtitle="Ranked matches for you" />
      <SwipeDeck initial={candidates} />
    </>
  );
}
