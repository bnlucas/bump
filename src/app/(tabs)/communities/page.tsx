import { redirect } from "next/navigation";
import { ScreenHeader } from "@/components/screen-header";
import { currentSession } from "@/lib/auth/session";
import { listPosts } from "@/lib/posts";
import { listConsents } from "@/lib/consents";
import { listVocabTopics } from "@/lib/vocab";
import { readActiveContext } from "@/lib/context";
import { CommunityFeed } from "./feed";

export const dynamic = "force-dynamic";

export default async function CommunitiesPage() {
  const session = await currentSession();
  if (!session) redirect("/auth");

  const [allPosts, granted, topicVocab, activeContext] = await Promise.all([
    listPosts(session.externalId),
    listConsents(session.externalId),
    listVocabTopics(),
    readActiveContext(),
  ]);

  const grantedKeys = granted.map((c) => c.consent_type);
  const filterKey =
    activeContext && grantedKeys.includes(activeContext) ? activeContext : null;
  const posts = filterKey
    ? allPosts.filter((p) => p.layer_key === filterKey)
    : allPosts;

  return (
    <>
      <ScreenHeader title="Communities" />
      <CommunityFeed
        initial={posts}
        userId={session.externalId}
        layerKeys={grantedKeys}
        activeFilter={filterKey}
        topicVocab={topicVocab}
      />
    </>
  );
}
