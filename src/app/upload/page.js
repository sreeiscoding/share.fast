"use client";

import Link from "next/link";

import { useAuth } from "@/hooks/useAuth";
import { UploadForm } from "@/components/upload/UploadForm";

export default function UploadPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Upload</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Upload files to Firebase Storage and save metadata to Firestore.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
          >
            Dashboard
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
          >
            Home
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <UploadForm uid={user.uid} />
      </div>
    </div>
  );
}
