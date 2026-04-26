import { redirect } from "next/navigation";
import Link from "next/link";
import { currentSession } from "@/lib/auth/session";
import { Avatar } from "@/components/avatar";
import { heraldAdmin } from "@/lib/herald-admin";
import { mintHeraldToken } from "@/lib/herald-token";
import { messagingAllowed, userBasic } from "@/lib/match";
import { ChatRoom } from "./chat-room";

export const dynamic = "force-dynamic";

const FALLBACK_NAME = "Someone you matched with";

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

  const counterpartId =
    members.find((m) => m.user_id !== session.externalId)?.user_id ?? null;
  const counterpart = counterpartId ? await userBasic(counterpartId) : null;
  const counterpartName = counterpart?.display_name ?? FALLBACK_NAME;
  const counterpartPhotoId = counterpart?.primary_photo_id ?? null;

  if (counterpartId) {
    const permission = await messagingAllowed(session.externalId, counterpartId);
    if (!permission.allowed) {
      return (
        <PermissionDenied
          counterpartName={counterpartName}
          counterpartPhotoId={counterpartPhotoId}
        />
      );
    }
  }

  const creds = mintHeraldToken(session.externalId, [streamId]);

  return (
    <div className="flex h-dvh flex-col">
      <ChatHeader title={counterpartName} photoId={counterpartPhotoId} />
      <ChatRoom
        creds={creds}
        streamId={streamId}
        recipientExternalId={counterpartId}
      />
    </div>
  );
}

function ChatHeader({
  title,
  photoId,
}: {
  title: string;
  photoId: string | null;
}) {
  return (
    <header
      className="flex items-center gap-3 border-b border-[color:var(--border)] bg-[color:var(--background)] px-4"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)", paddingBottom: "0.75rem" }}
    >
      <Link
        href="/chat"
        className="text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
        aria-label="Back"
      >
        ‹
      </Link>
      <Avatar photoId={photoId} name={title} size={36} />
      <h1 className="min-w-0 truncate text-base font-semibold">{title}</h1>
    </header>
  );
}

function PermissionDenied({
  counterpartName,
  counterpartPhotoId,
}: {
  counterpartName: string;
  counterpartPhotoId: string | null;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <ChatHeader title={counterpartName} photoId={counterpartPhotoId} />
      <section className="flex flex-1 items-center justify-center px-6 text-center">
        <p className="text-sm text-[color:var(--muted-foreground)]">
          You can&rsquo;t message here right now.
        </p>
      </section>
    </div>
  );
}
