"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

type Mode = "signin" | "signup";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const path = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
    const body =
      mode === "signup"
        ? { email, password, displayName }
        : { email, password };

    startTransition(async () => {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? `Request failed (${res.status}).`);
        return;
      }
      router.replace("/profile");
      router.refresh();
    });
  }

  return (
    <div>
      <div
        role="tablist"
        className="mb-6 grid grid-cols-2 rounded-full border border-[color:var(--border)] bg-[color:var(--muted)] p-1 text-sm font-medium"
      >
        {(["signup", "signin"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={cn(
              "rounded-full py-2 transition-colors",
              mode === m
                ? "bg-[color:var(--background)] text-[color:var(--foreground)] shadow-sm"
                : "text-[color:var(--muted-foreground)]",
            )}
            onClick={() => setMode(m)}
          >
            {m === "signup" ? "Create account" : "Sign in"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        {mode === "signup" ? (
          <Field label="Display name">
            <input
              type="text"
              autoComplete="nickname"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              className={inputCls}
            />
          </Field>
        ) : null}
        <Field label="Email">
          <input
            type="email"
            autoComplete={mode === "signup" ? "email" : "username"}
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
        </Field>

        {error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-[color:var(--accent)] py-3 font-semibold text-[color:var(--accent-foreground)] transition-opacity disabled:opacity-60"
        >
          {pending
            ? "…"
            : mode === "signup"
              ? "Create account"
              : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-3 text-base outline-none focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/30";
