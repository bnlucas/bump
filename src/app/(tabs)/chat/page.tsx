import Link from "next/link";
import { redirect } from "next/navigation";
import { ScreenHeader } from "@/components/screen-header";
import { currentSession } from "@/lib/auth/session";
import { listConversations } from "@/lib/match";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const session = await currentSession();
  if (!session) redirect("/auth");

  const conversations = await listConversations(session.externalId);

  return (
    <>
      <ScreenHeader title="Chat" subtitle={`${conversations.length} conversations`} />
      <section className="px-4 py-4">
        {conversations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-center text-[color:var(--muted-foreground)]">
            <p className="text-sm">
              No conversations yet. Connect with someone in Discover to start one.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[color:var(--border)] rounded-2xl border border-[color:var(--border)]">
            {conversations.map((c) => (
              <li key={c.stream_id}>
                <Link
                  href={`/chat/${encodeURIComponent(c.stream_id)}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[color:var(--muted)]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {c.display_name ?? c.counterpart_id}
                    </p>
                    <p className="truncate font-mono text-xs text-[color:var(--muted-foreground)]">
                      {Math.round(c.score * 100)}% · {c.stream_id}
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
