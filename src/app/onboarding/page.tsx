import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth/session";
import { loadProfile } from "@/lib/profile";
import { listConsentLayers, listConsents } from "@/lib/consents";
import { listVocabTags } from "@/lib/vocab";
import { listPhotoIds } from "@/lib/photos";
import { OnboardingFlow } from "./flow";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await currentSession();
  if (!session) redirect("/auth");

  const [profile, granted, layers, vocab, photoIds] = await Promise.all([
    loadProfile(session.externalId),
    listConsents(session.externalId),
    listConsentLayers(),
    listVocabTags(),
    listPhotoIds(session.externalId),
  ]);

  if (granted.length > 0) redirect("/discover");

  return (
    <OnboardingFlow
      initialDisplayName={profile.display_name ?? ""}
      initialPhotoIds={photoIds}
      initialConsents={granted}
      consentLayers={layers}
      vocab={vocab}
    />
  );
}
