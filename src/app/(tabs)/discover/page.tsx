import { ScreenHeader } from "@/components/screen-header";

export default function DiscoverPage() {
  return (
    <>
      <ScreenHeader title="Discover" subtitle="Ranked matches for you" />
      <section className="px-4 py-6">
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-center text-[color:var(--muted-foreground)]">
          <p className="text-sm">
            Swipe deck lands here. Backed by{" "}
            <code className="font-mono text-xs">/api/v1/users/&#123;ext&#125;/feed/ranked</code>{" "}
            via the Simbee SDK.
          </p>
        </div>
      </section>
    </>
  );
}
