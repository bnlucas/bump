import { ScreenHeader } from "@/components/screen-header";
import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <>
      <ScreenHeader title="Messages" />
      <section className="px-4 py-4">
        <ul className="divide-y divide-[color:var(--border)] rounded-2xl border border-[color:var(--border)]">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <Skeleton className="h-4 flex-1 max-w-[60%]" />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
