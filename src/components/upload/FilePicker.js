"use client";

import { useMemo, useRef, useState } from "react";

function normalizeAccept(accept) {
  return String(accept || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function matchesAccept(file, acceptList) {
  if (!acceptList.length) return true;
  const name = String(file?.name || "").toLowerCase();
  const type = String(file?.type || "").toLowerCase();

  return acceptList.some((rule) => {
    const r = rule.toLowerCase();
    if (!r) return true;

    // extension: .png
    if (r.startsWith(".")) return name.endsWith(r);

    // wildcard mime: image/*
    if (r.endsWith("/*")) {
      const prefix = r.slice(0, -1); // keep trailing '/'
      return type.startsWith(prefix);
    }

    // exact mime: image/png
    return type === r;
  });
}

export function FilePicker({
  id,
  label,
  help,
  accept,
  multiple = false,
  onPick,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [dropNote, setDropNote] = useState("");

  const acceptList = useMemo(() => normalizeAccept(accept), [accept]);

  function openPicker() {
    if (disabled) return;
    inputRef.current?.click();
  }

  function handleFiles(rawFiles) {
    const files = Array.from(rawFiles ?? []);
    const accepted = files.filter((f) => matchesAccept(f, acceptList));

    const picked = multiple ? accepted : accepted.slice(0, 1);
    const ignored = files.length - picked.length;

    if (!picked.length) {
      setDropNote(files.length ? "No accepted files." : "");
      return;
    }

    if (ignored > 0) setDropNote(`${ignored} file(s) ignored.`);
    else setDropNote("");

    onPick(picked);
  }

  function onDragEnter(e) {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function onDragOver(e) {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function onDragLeave(e) {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();

    // Only deactivate when leaving the dropzone container.
    const next = e.relatedTarget;
    if (next && e.currentTarget?.contains?.(next)) return;
    setDragActive(false);
  }

  function onDrop(e) {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const dt = e.dataTransfer;
    if (!dt) return;

    handleFiles(dt.files);
  }

  return (
    <div className="rounded-2xl border border-zinc-200/60 bg-white p-6 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {label}
          </div>
          {help ? (
            <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              {help}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            disabled
              ? "cursor-not-allowed bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
              : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          }`}
        >
          Choose
        </button>
      </div>

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`mt-4 rounded-2xl border border-dashed p-6 text-center transition-colors ${
          disabled
            ? "cursor-not-allowed border-zinc-200 bg-zinc-50 opacity-70 dark:border-zinc-800 dark:bg-zinc-950/20"
            : dragActive
              ? "border-zinc-900 bg-zinc-50 dark:border-white dark:bg-zinc-950/40"
              : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
        }`}
      >
        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Drag & drop {multiple ? "files" : "a file"} here
        </div>
        <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          or click to browse
        </div>
        {dropNote ? (
          <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
            {dropNote}
          </div>
        ) : null}
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
