import { ScreenHeader } from "@/components/screen-header";
import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <>
      <ScreenHeader title="Communities" />
      <section className="px-4 py-4">
        <div className="mb-4 flex gap-2">
          <Skeleton className="h-8 w-12 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <Skeleton className="mb-6 h-12 w-full rounded-full" />
        <ul className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li
              key={i}
              className="space-y-2 rounded-2xl border border-[color:var(--border)] p-4"
            >
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
