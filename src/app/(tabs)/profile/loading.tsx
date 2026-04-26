import { ScreenHeader } from "@/components/screen-header";
import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <>
      <ScreenHeader title="Profile" />
      <section className="space-y-6 px-4 py-6">
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-full" />
        <hr className="border-[color:var(--border)]" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </section>
    </>
  );
}
