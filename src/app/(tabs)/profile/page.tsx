import { redirect } from "next/navigation";
import { ScreenHeader } from "@/components/screen-header";
import { currentSession } from "@/lib/auth/session";
import { loadProfile } from "@/lib/profile";
import { listConsentLayers, listConsents } from "@/lib/consents";
import { listVocabTags, listVocabTopics } from "@/lib/vocab";
import { listAffinityPreferences, listAffinityRoles } from "@/lib/affinity-config";
import { listPhotoIds } from "@/lib/photos";
import { ProfileEditor } from "./profile-editor";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await currentSession();
  if (!session) redirect("/auth");

  const [profile, granted, layers, vocab, topicVocab, preferences, roles, photoIds] =
    await Promise.all([
      loadProfile(session.externalId),
      listConsents(session.externalId),
      listConsentLayers(),
      listVocabTags(),
      listVocabTopics(),
      listAffinityPreferences(),
      listAffinityRoles(),
      listPhotoIds(session.externalId),
    ]);

  return (
    <>
      <ScreenHeader title="Profile" subtitle={profile.email ?? undefined} />
      <ProfileEditor
        initial={profile}
        initialConsents={granted}
        consentLayers={layers}
        vocab={vocab}
        topicVocab={topicVocab}
        preferences={preferences}
        roles={roles}
        initialPhotoIds={photoIds}
      />
    </>
  );
}
