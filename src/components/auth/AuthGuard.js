"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/firebase";

export function AuthGuard({ children }) {
  const { user, loading, inviteStatus, checkingInvite } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const kickedRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${next}`);
      return;
    }

    if (inviteStatus !== "allowed" && inviteStatus !== "unknown" && !kickedRef.current) {
      kickedRef.current = true;
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
  }, [loading, user, inviteStatus, router, pathname]);

  if (loading || checkingInvite) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-2 px-6 text-center">
        <div className="text-base font-medium text-zinc-900 dark:text-zinc-50">
          Checking access...
        </div>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          Please wait while we verify your account.
        </div>
      </div>
    );
  }

  if (!user) return null;
  if (inviteStatus !== "allowed") return null;

  return children;
}
