"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { firebaseEnabled, loginWithEmailPassword, logout } from "@/lib/firebase";

export default function LoginClient({ blocked = false, nextPath = "/dashboard" }) {
  const { user, loading, inviteStatus, checkingInvite } = useAuth();
  const router = useRouter();
  const handledDeniedRef = useRef(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (user && inviteStatus === "allowed") {
      router.replace(nextPath);
      return;
    }

    if (user && inviteStatus === "denied" && !handledDeniedRef.current) {
      handledDeniedRef.current = true;
      (async () => {
        try {
          await logout();
        } catch {
          // ignore
        } finally {
          router.replace("/login?blocked=1");
        }
      })();
    }
  }, [loading, user, inviteStatus, router, nextPath]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!firebaseEnabled) {
      setError(
        "Setup required: add your Firebase web app config in .env.local (see .env.example), then restart the dev server."
      );
      return;
    }

    setBusy(true);
    try {
      await loginWithEmailPassword(email, password);
      router.replace(nextPath);
    } catch (err) {
      setError(err?.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-16">
      {loading || checkingInvite ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Checking session...
        </p>
      ) : null}

      <div className="rounded-2xl border border-zinc-200/60 bg-white p-8 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/30">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              This app is invite-only. Sign in with an approved email.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
          >
            Home
          </Link>
        </div>

        {blocked ? (
          <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            Access blocked: your email is not on the approved list.
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/30 dark:focus:border-zinc-600"
              placeholder="you@example.com"
              autoComplete="email"
              disabled={!firebaseEnabled}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/30 dark:focus:border-zinc-600"
              placeholder="********"
              autoComplete="current-password"
              disabled={!firebaseEnabled}
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy || !firebaseEnabled}
            className="inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {!firebaseEnabled ? (
          <p className="mt-6 text-xs text-zinc-600 dark:text-zinc-400">
            Add your Firebase Web App config in{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50">
              .env.local
            </code>
            {" "}(copy keys from{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50">
              .env.example
            </code>
            ), then restart{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50">
              npm run dev
            </code>
            .
          </p>
        ) : null}

        <p className="mt-6 text-xs text-zinc-600 dark:text-zinc-400">
          Need access? Add your email to Firestore collection{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50">
            allowedUsers
          </code>
          {" "}(doc id = your lowercased email).
        </p>
      </div>
    </div>
  );
}
