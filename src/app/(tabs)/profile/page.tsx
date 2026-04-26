import { ScreenHeader } from "@/components/screen-header";

export default function ProfilePage() {
  return (
    <>
      <ScreenHeader title="Profile" subtitle="Your card, photos, and preferences" />
      <section className="px-4 py-6">
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-center text-[color:var(--muted-foreground)]">
          <p className="text-sm">
            Profile editor lands here. Photos go through ShrouDB{" "}
            <code className="font-mono text-xs">stash</code>; profile data sits
            in Simbee user + match preferences.
          </p>
        </div>
      </section>
    </>
  );
}
