"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/firebase";

export default function Home() {
  const { user, loading, inviteStatus, checkingInvite } = useAuth();
  const router = useRouter();
  const handledDeniedRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (inviteStatus === "allowed") {
      router.replace("/dashboard");
      return;
    }

    if (inviteStatus === "denied" && !handledDeniedRef.current) {
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
  }, [loading, user, inviteStatus, router]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-2 px-6 text-center">
      <div className="text-base font-medium text-zinc-900 dark:text-zinc-50">
        {loading || checkingInvite ? "Checking access..." : "Redirecting..."}
      </div>
      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        Please wait.
      </div>
    </div>
  );
}
