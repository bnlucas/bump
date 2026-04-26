import { redirect } from "next/navigation";
import { ScreenHeader } from "@/components/screen-header";
import { currentSession } from "@/lib/auth/session";
import { loadProfile } from "@/lib/profile";
import { ProfileEditor } from "./profile-editor";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await currentSession();
  if (!session) redirect("/auth");

  const profile = await loadProfile(session.externalId);

  return (
    <>
      <ScreenHeader title="Profile" subtitle={profile.email ?? undefined} />
      <ProfileEditor initial={profile} />
    </>
  );
}
