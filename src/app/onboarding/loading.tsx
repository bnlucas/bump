import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-screen-sm flex-col gap-8 px-6 pb-24"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 2rem)" }}
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </main>
  );
}
