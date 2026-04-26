import { BottomNav } from "@/components/bottom-nav";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 mx-auto w-full max-w-screen-sm">{children}</main>
      <BottomNav />
    </div>
  );
}
