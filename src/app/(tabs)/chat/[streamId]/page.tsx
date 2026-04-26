import { redirect } from "next/navigation";
import Link from "next/link";
import { currentSession } from "@/lib/auth/session";
import { heraldAdmin } from "@/lib/herald-admin";
import { mintHeraldToken } from "@/lib/herald-token";
import { ChatRoom } from "./chat-room";

export const dynamic = "force-dynamic";

export default async function ChatStreamPage({
  params,
}: {
  params: Promise<{ streamId: string }>;
}) {
  const session = await currentSession();
  if (!session) redirect("/auth");

  const { streamId } = await params;
  const members = await heraldAdmin()
    .members.list(streamId)
    .catch(() => []);
  const isMember = members.some((m) => m.user_id === session.externalId);
  if (!isMember) redirect("/chat");

  const creds = mintHeraldToken(session.externalId, [streamId]);
  const counterpart = members.find((m) => m.user_id !== session.externalId)?.user_id ?? null;

  return (
    <div className="flex h-dvh flex-col">
      <header
        className="flex items-center gap-3 border-b border-[color:var(--border)] bg-[color:var(--background)] px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)", paddingBottom: "0.75rem" }}
      >
        <Link
          href="/chat"
          className="text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
          aria-label="Back to chat list"
        >
          ‹
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold">
            {counterpart ?? "(no other member)"}
          </h1>
          <p className="truncate font-mono text-[10px] text-[color:var(--muted-foreground)]">
            {streamId}
          </p>
        </div>
      </header>
      <ChatRoom creds={creds} streamId={streamId} />
    </div>
  );
}
