import { ScreenHeader } from "@/components/screen-header";

export default function ChatPage() {
  return (
    <>
      <ScreenHeader title="Chat" subtitle="Matches and group rooms" />
      <section className="px-4 py-6">
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-center text-[color:var(--muted-foreground)]">
          <p className="text-sm">
            Conversation list lands here. Each match opens a Herald stream
            rendered with{" "}
            <code className="font-mono text-xs">&lt;HeraldChat&gt;</code> from
            <code className="font-mono text-xs"> @skeptik-io/herald-chat-react</code>.
          </p>
        </div>
      </section>
    </>
  );
}
