import { ScreenHeader } from "@/components/screen-header";
import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <>
      <ScreenHeader title="Discover" />
      <section className="flex flex-col gap-4 px-4 py-4">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
        <Skeleton className="aspect-[4/5] w-full rounded-3xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-12 rounded-full" />
          <Skeleton className="h-12 rounded-full" />
        </div>
      </section>
    </>
  );
}
