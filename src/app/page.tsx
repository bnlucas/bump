import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth/session";
import { listConsents } from "@/lib/consents";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const session = await currentSession();
  if (!session) redirect("/auth");

  const granted = await listConsents(session.externalId);
  redirect(granted.length === 0 ? "/onboarding" : "/discover");
}
