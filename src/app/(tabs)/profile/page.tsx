import { redirect } from "next/navigation";
import { ScreenHeader } from "@/components/screen-header";
import { currentSession } from "@/lib/auth/session";
import { loadProfile } from "@/lib/profile";
import { listConsentLayers, listConsents } from "@/lib/consents";
import { ProfileEditor } from "./profile-editor";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await currentSession();
  if (!session) redirect("/auth");

  const [profile, granted, layers] = await Promise.all([
    loadProfile(session.externalId),
    listConsents(session.externalId),
    listConsentLayers(),
  ]);

  return (
    <>
      <ScreenHeader title="Profile" subtitle={profile.email ?? undefined} />
      <ProfileEditor initial={profile} initialConsents={granted} consentLayers={layers} />
    </>
  );
}
