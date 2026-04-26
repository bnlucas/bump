import { redirect } from "next/navigation";
import { ScreenHeader } from "@/components/screen-header";
import { currentSession } from "@/lib/auth/session";
import { listPosts } from "@/lib/posts";
import { CommunityFeed } from "./feed";

export const dynamic = "force-dynamic";

export default async function CommunitiesPage() {
  const session = await currentSession();
  if (!session) redirect("/auth");

  const posts = await listPosts();

  return (
    <>
      <ScreenHeader title="Communities" />
      <CommunityFeed initial={posts} userId={session.externalId} />
    </>
  );
}
