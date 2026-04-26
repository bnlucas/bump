import { cn } from "@/lib/cn";

export function Skeleton({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md bg-[color:var(--muted)]",
        className,
      )}
      {...rest}
    />
  );
}
