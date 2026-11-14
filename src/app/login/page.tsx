"use client";

import { authErrorMessage, useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo";
import { Loader2, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}

const input =
  "h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm outline-none transition focus:border-sky focus:ring-4 focus:ring-sky-tint";

function LoginInner() {
  const { user, loading, signInEmail, signUpEmail, signInGoogle } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next") || "/explore";
  const [tab, setTab] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, user, router, next]);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    run("form", () => (tab === "in" ? signInEmail(email, password) : signUpEmail(name.trim(), email, password)));
  }

  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-10 sm:py-16">
      <div className="card p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <LogoMark size={40} />
          <h1 className="mt-4 text-2xl">{tab === "in" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-1 text-sm text-muted">One account to book chargers and to host your own.</p>
        </div>

        <div className="mt-6 grid grid-cols-2 rounded-full border border-line bg-slate-50 p-1 text-sm font-medium">
          {(["in", "up"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn("rounded-full py-1.5 transition", tab === t ? "bg-white shadow-soft ring-1 ring-line" : "text-muted")}
            >
              {t === "in" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>

        <Button variant="outline" className="mt-6 w-full" disabled={!!busy} onClick={() => run("google", signInGoogle)}>
          {busy === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />} Continue with Google
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" /> or with email <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {tab === "up" && (
            <input className={input} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
          )}
          <input className={input} type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input
            className={input}
            type="password"
            placeholder="Password"
            autoComplete={tab === "in" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Button type="submit" className="w-full" disabled={!!busy}>
            {busy === "form" && <Loader2 className="h-4 w-4 animate-spin" />}
            {tab === "in" ? "Sign in" : "Create account"}
          </Button>
        </form>
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-sky/40 bg-sky-tint/50 p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-sky-600">
          <Sparkles className="h-4 w-4" /> Demo accounts
        </p>
        <p className="mt-0.5 text-xs text-muted">
          Password <span className="num text-ink">{DEMO_PASSWORD}</span> for all three.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              disabled={!!busy}
              onClick={() => run(a.email, () => signInEmail(a.email, DEMO_PASSWORD))}
              className="rounded-xl border border-line bg-white px-2 py-2 text-left transition hover:border-sky hover:shadow-soft disabled:opacity-50"
            >
              <span className="flex items-center gap-1 text-sm font-medium">
                {busy === a.email && <Loader2 className="h-3 w-3 animate-spin" />}
                {a.role}
              </span>
              <span className="block truncate text-[11px] text-muted">{a.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
