import { ScreenHeader } from "@/components/screen-header";

export default function CommunitiesPage() {
  return (
    <>
      <ScreenHeader title="Communities" subtitle="Threads and live rooms" />
      <section className="px-4 py-6">
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-center text-[color:var(--muted-foreground)]">
          <p className="text-sm">Coming soon.</p>
        </div>
      </section>
    </>
  );
}
