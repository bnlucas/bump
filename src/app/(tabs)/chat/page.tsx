import Link from "next/link";
import { redirect } from "next/navigation";
import { ScreenHeader } from "@/components/screen-header";
import { currentSession } from "@/lib/auth/session";
import { userStreamIds } from "@/lib/match";
import { heraldAdmin } from "@/lib/herald-admin";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const session = await currentSession();
  if (!session) redirect("/auth");

  const ids = await userStreamIds(session.externalId);
  const admin = heraldAdmin();

  const items = await Promise.all(
    ids.map(async (id) => {
      const members = await admin.members.list(id).catch(() => []);
      const counterpart = members.find((m) => m.user_id !== session.externalId)?.user_id;
      return { stream_id: id, counterpart };
    }),
  );

  return (
    <>
      <ScreenHeader title="Chat" subtitle={`${items.length} conversations`} />
      <section className="px-4 py-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-center text-[color:var(--muted-foreground)]">
            <p className="text-sm">
              No conversations yet. Connect with someone in Discover to start one.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[color:var(--border)] rounded-2xl border border-[color:var(--border)]">
            {items.map((it) => (
              <li key={it.stream_id}>
                <Link
                  href={`/chat/${encodeURIComponent(it.stream_id)}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[color:var(--muted)]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {it.counterpart ?? "(empty conversation)"}
                    </p>
                    <p className="truncate font-mono text-xs text-[color:var(--muted-foreground)]">
                      {it.stream_id}
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
