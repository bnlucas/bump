import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth/session";
import { AuthForm } from "./auth-form";

export default async function AuthPage() {
  const session = await currentSession();
  if (session) redirect("/profile");

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-screen-sm flex-col px-6 pb-10"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 2.5rem)" }}
    >
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Bump</h1>
        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
          Connect, match, and gather.
        </p>
      </header>
      <AuthForm />
    </main>
  );
}
