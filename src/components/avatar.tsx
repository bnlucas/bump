export function Avatar({
  photoId,
  name,
  size = 40,
}: {
  photoId: string | null;
  name: string | null;
  size?: number;
}) {
  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className="shrink-0 overflow-hidden rounded-full bg-[color:var(--muted)] text-[color:var(--muted-foreground)]"
      style={{ width: size, height: size }}
    >
      {photoId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/photos/${encodeURIComponent(photoId)}`}
          alt=""
          loading="lazy"
          decoding="async"
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center font-semibold"
          style={{ fontSize: size * 0.45 }}
          aria-hidden
        >
          {initial}
        </div>
      )}
    </div>
  );
}
