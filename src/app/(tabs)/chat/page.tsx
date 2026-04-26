import Link from "next/link";
import { redirect } from "next/navigation";
import { ScreenHeader } from "@/components/screen-header";
import { Avatar } from "@/components/avatar";
import { currentSession } from "@/lib/auth/session";
import { listConversations } from "@/lib/match";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const session = await currentSession();
  if (!session) redirect("/auth");

  const conversations = await listConversations(session.externalId);

  return (
    <>
      <ScreenHeader title="Messages" />
      <section className="px-4 py-4">
        {conversations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-center text-[color:var(--muted-foreground)]">
            <p className="text-sm">
              No messages yet. Say hi to someone in Discover to get started.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[color:var(--border)] rounded-2xl border border-[color:var(--border)]">
            {conversations.map((c) => (
              <li key={c.stream_id}>
                <Link
                  href={`/chat/${encodeURIComponent(c.stream_id)}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[color:var(--muted)]"
                >
                  <Avatar
                    photoId={c.primary_photo_id}
                    name={c.display_name}
                    size={44}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {c.display_name ?? "Someone you matched with"}
                    </p>
                  </div>
                  <span aria-hidden className="text-[color:var(--muted-foreground)]">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
