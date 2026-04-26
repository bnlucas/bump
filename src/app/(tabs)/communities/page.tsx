import { ScreenHeader } from "@/components/screen-header";

export default function CommunitiesPage() {
  return (
    <>
      <ScreenHeader title="Communities" subtitle="Topics, threads, and live rooms" />
      <section className="px-4 py-6">
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-center text-[color:var(--muted-foreground)]">
          <p className="text-sm">
            Community feed lands here. Posts + votes ride Simbee{" "}
            <code className="font-mono text-xs">content</code> +{" "}
            <code className="font-mono text-xs">signals</code>; live rooms ride
            Herald streams.
          </p>
        </div>
      </section>
    </>
  );
}
