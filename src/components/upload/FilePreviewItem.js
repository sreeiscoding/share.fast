"use client";

import { useEffect, useMemo } from "react";
import { formatBytes } from "./formatBytes";

function getExtension(name) {
  const idx = name.lastIndexOf(".");
  if (idx === -1) return "";
  return name.slice(idx + 1).toUpperCase();
}

function getBadge(status, progress) {
  if (status === "uploading") {
    return {
      text: `Uploading ${progress}%`,
      className: "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900",
    };
  }
  if (status === "saving") {
    return {
      text: "Saving...",
      className: "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900",
    };
  }
  if (status === "saved") {
    return { text: "Saved", className: "bg-emerald-600 text-white" };
  }
  if (status === "uploaded") {
    return { text: "Uploaded", className: "bg-emerald-600 text-white" };
  }
  if (status === "error") {
    return { text: "Error", className: "bg-red-600 text-white" };
  }
  return {
    text: "Ready",
    className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  };
}

export function FilePreviewItem({ item, onRemove }) {
  const {
    file,
    kind = "file",
    status = "queued",
    progress = 0,
    url = "",
    error = "",
  } = item;

  const isImage = file.type?.startsWith("image/");
  const previewUrl = useMemo(() => {
    if (!isImage) return "";
    return URL.createObjectURL(file);
  }, [file, isImage]);

  const meta = useMemo(() => {
    return {
      name: file.name,
      size: formatBytes(file.size),
      type: file.type || "unknown",
      ext: getExtension(file.name),
    };
  }, [file]);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const badge = getBadge(status, progress);
  const removeDisabled = status === "uploading" || status === "saving";

  return (
    <div className="rounded-2xl border border-zinc-200/60 bg-white p-4 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/30">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/30">
          {isImage && previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={meta.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              {meta.ext || (kind === "thumbnail" ? "IMG" : "FILE")}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {meta.name}
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${badge.className}`}
            >
              {badge.text}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
            <span>{meta.size}</span>
            <span className="truncate">{meta.type}</span>
          </div>

          {status === "uploading" ? (
            <div className="mt-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-zinc-900 transition-all dark:bg-white"
                  style={{
                    width: `${Math.min(100, Math.max(0, progress))}%`,
                  }}
                />
              </div>
            </div>
          ) : null}

          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block break-all text-xs font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-50"
            >
              {url}
            </a>
          ) : null}

          {status === "error" && error ? (
            <div className="mt-3 text-xs text-red-700 dark:text-red-200">
              {error}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onRemove}
          disabled={removeDisabled}
          className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:bg-transparent dark:text-zinc-50 dark:hover:bg-zinc-900/40"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

