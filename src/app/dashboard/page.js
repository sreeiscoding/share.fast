"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";

import { useAuth } from "@/hooks/useAuth";
import { db, logout } from "@/lib/firebase";

function titleCase(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const filters = ["All", "Intro", "Body", "Outro"];

function toMillis(maybeTimestamp) {
  if (!maybeTimestamp) return 0;
  if (typeof maybeTimestamp.toMillis === "function") return maybeTimestamp.toMillis();
  if (typeof maybeTimestamp.seconds === "number") return maybeTimestamp.seconds * 1000;
  return 0;
}

function safeFileName(name) {
  return String(name || "download").replace(/[\\/:*?"<>|]+/g, "_");
}

function fileNameFromFirebaseUrl(fileUrl) {
  try {
    const url = new URL(fileUrl);
    const match = url.pathname.match(/\/o\/(.+)$/);
    if (!match) return "download";
    const decodedPath = decodeURIComponent(match[1]);
    const parts = decodedPath.split("/");
    return parts[parts.length - 1] || "download";
  } catch {
    return "download";
  }
}

async function downloadFromUrl(fileUrl, fileName) {
  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = safeFileName(fileName);
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [media, setMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [downloadingId, setDownloadingId] = useState("");
  const [downloadError, setDownloadError] = useState("");

  const mediaMapRef = useRef(new Map());

  const mediaQuery = useMemo(() => {
    if (!db) return null;
    return query(
      collection(db, "media"),
      orderBy("createdAt", "desc"),
      limit(60)
    );
  }, []);

  useEffect(() => {
    if (!mediaQuery) {
      setMediaLoading(false);
      setMediaError("Firestore is not configured.");
      return;
    }

    const unsub = onSnapshot(
      mediaQuery,
      (snap) => {
        const mediaMap = mediaMapRef.current;

        for (const change of snap.docChanges()) {
          const id = change.doc.id;
          if (change.type === "removed") {
            mediaMap.delete(id);
            continue;
          }
          mediaMap.set(id, { id, ...change.doc.data() });
        }

        const next = Array.from(mediaMap.values()).sort((a, b) => {
          return toMillis(b.createdAt) - toMillis(a.createdAt);
        });

        // Enforce limit defensively even if local cache returns more.
        setMedia(next.slice(0, 60));
        setMediaLoading(false);
      },
      (err) => {
        setMediaError(err?.message ?? "Failed to load media.");
        setMediaLoading(false);
      }
    );

    return () => unsub();
  }, [mediaQuery]);

  async function handleLogout() {
    setError("");
    setBusy(true);
    try {
      await logout();
      router.replace("/login");
    } catch (err) {
      setError(err?.message ?? "Logout failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload(item) {
    if (!item?.fileUrl) return;
    if (downloadingId) return;
    setDownloadError("");
    setDownloadingId(item.id);
    try {
      const name =
        item.fileName || fileNameFromFirebaseUrl(item.fileUrl) || "download";
      await downloadFromUrl(item.fileUrl, name);
    } catch (err) {
      setDownloadError(err?.message ?? "Failed to download");
    } finally {
      setDownloadingId("");
    }
  }

  if (!user) return null;

  const filteredMedia =
    activeFilter === "All"
      ? media
      : media.filter((item) => item.category === activeFilter.toLowerCase());

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Signed in as <span className="font-medium">{user.email}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/upload"
            className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
          >
            Upload
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
          >
            Home
          </Link>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {filters.map((f) => {
          const active = f === activeFilter;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                active
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-transparent dark:text-zinc-50 dark:hover:bg-zinc-900/40"
              }`}
            >
              {f}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <div className="mt-8 rounded-2xl border border-zinc-200/60 bg-white p-8 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/30">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">Account</div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              UID: <span className="font-mono">{user.uid}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={busy}
            className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {busy ? "Signing out..." : "Logout"}
          </button>
        </div>
      </div>

      {mediaError ? (
        <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {mediaError}
        </p>
      ) : null}

      {downloadError ? (
        <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {downloadError}
        </p>
      ) : null}

      {mediaLoading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-zinc-200/60 bg-white shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/30"
            >
              <div className="aspect-video w-full animate-pulse bg-zinc-100 dark:bg-zinc-800" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-32 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                <div className="h-3 w-20 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      ) : media.length === 0 && !mediaError ? (
        <div className="mt-8 rounded-2xl border border-zinc-200/60 bg-white p-10 text-center shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/30">
          <h2 className="text-lg font-semibold">No uploads yet</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Upload your first media file to see it here.
          </p>
          <Link
            href="/upload"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Go to upload
          </Link>
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-zinc-200/60 bg-white p-10 text-center shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/30">
          <h2 className="text-lg font-semibold">No media in {activeFilter}</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Try a different filter or upload more files.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMedia.map((item) => {
            const previewUrl = item.thumbnailUrl || item.fileUrl || "";
            const categoryTag = titleCase(item.category);
            const isVideo = item.type === "video";

            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-zinc-200/60 bg-white shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/30"
              >
                <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-800">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={item.fileUrl ? "Uploaded media" : "Media"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-medium text-zinc-600 dark:text-zinc-300">
                      {isVideo ? "Video" : "Media"}
                    </div>
                  )}

                  {categoryTag ? (
                    <div className="absolute left-3 top-3">
                      <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-zinc-900 shadow-sm backdrop-blur dark:bg-zinc-950/80 dark:text-zinc-50">
                        {categoryTag}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {item.type ? titleCase(item.type) : "Media"}
                    </div>
                    <div className="flex items-center gap-3">
                      {item.fileUrl ? (
                        <a
                          href={item.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-50"
                        >
                          Open
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleDownload(item)}
                        disabled={!item.fileUrl || downloadingId === item.id}
                        className="text-xs font-medium text-zinc-900 underline underline-offset-2 disabled:opacity-60 dark:text-zinc-50"
                      >
                        {downloadingId === item.id
                          ? "Downloading..."
                          : "Download"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
