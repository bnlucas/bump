export function ScreenHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header
      className="sticky top-0 z-20 border-b border-[color:var(--border)] bg-[color:var(--background)]/90 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--background)]/70 px-4"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)", paddingBottom: "0.75rem" }}
    >
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {subtitle ? (
        <p className="text-sm text-[color:var(--muted-foreground)]">{subtitle}</p>
      ) : null}
    </header>
  );
}
