import { redirect } from "next/navigation";
import { ScreenHeader } from "@/components/screen-header";
import { currentSession } from "@/lib/auth/session";
import { listPosts } from "@/lib/posts";
import { listConsents } from "@/lib/consents";
import { listVocabTopics } from "@/lib/vocab";
import { CommunityFeed } from "./feed";

export const dynamic = "force-dynamic";

export default async function CommunitiesPage() {
  const session = await currentSession();
  if (!session) redirect("/auth");

  const [posts, granted, topicVocab] = await Promise.all([
    listPosts(session.externalId),
    listConsents(session.externalId),
    listVocabTopics(),
  ]);

  return (
    <>
      <ScreenHeader title="Communities" />
      <CommunityFeed
        initial={posts}
        userId={session.externalId}
        layerKeys={granted.map((c) => c.consent_type)}
        topicVocab={topicVocab}
      />
    </>
  );
}
