"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";

import { CategorySelect } from "./CategorySelect";
import { FilePicker } from "./FilePicker";
import { FilePreviewList } from "./FilePreviewList";

import { db, storage } from "@/lib/firebase";

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function guessType(mime) {
  if (!mime) return "file";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "file";
}

function signatureFor(file, kind) {
  return `${kind}:${file.name}:${file.size}:${file.lastModified}`;
}

function makeItem(file, kind) {
  return {
    id: makeId(),
    kind,
    file,
    signature: signatureFor(file, kind),
    status: "queued", // queued | uploading | uploaded | saving | saved | error
    progress: 0,
    url: "",
    storagePath: "",
    error: "",
  };
}

function dedupeAppend(prevItems, pickedFiles, kind) {
  const existing = new Set(prevItems.map((i) => i.signature));
  const next = [...prevItems];
  for (const f of pickedFiles) {
    const sig = signatureFor(f, kind);
    if (existing.has(sig)) continue;
    existing.add(sig);
    next.push(makeItem(f, kind));
  }
  return next;
}

export function UploadForm({ uid }) {
  const mountedRef = useRef(true);
  const fileItemsRef = useRef([]);
  const thumbnailRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [category, setCategory] = useState("Intro");
  const [fileItems, setFileItems] = useState([]);
  const [thumbnailItem, setThumbnailItem] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fileItemsRef.current = fileItems;
  }, [fileItems]);

  useEffect(() => {
    thumbnailRef.current = thumbnailItem;
  }, [thumbnailItem]);

  const canUpload = useMemo(() => {
    return Boolean(uid && storage && db && fileItems.length);
  }, [uid, fileItems.length]);

  function updateFileItem(id, patch) {
    if (!mountedRef.current) return;
    setFileItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function updateThumbnail(patch) {
    if (!mountedRef.current) return;
    setThumbnailItem((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function uploadItem(item, basePath, onUpdate) {
    onUpdate({ status: "uploading", progress: 0, error: "" });
    const fileRef = ref(storage, `${basePath}/${item.file.name}`);
    const task = uploadBytesResumable(fileRef, item.file);

    await new Promise((resolve, reject) => {
      task.on(
        "state_changed",
        (snap) => {
          const total = snap.totalBytes || 0;
          const transferred = snap.bytesTransferred || 0;
          const percent = total ? Math.round((transferred / total) * 100) : 0;
          onUpdate({ progress: percent });
        },
        (err) => reject(err),
        () => resolve()
      );
    });

    const url = await getDownloadURL(task.snapshot.ref);
    onUpdate({
      status: "uploaded",
      progress: 100,
      url,
      storagePath: task.snapshot.ref.fullPath,
      error: "",
    });
    return url;
  }

  async function saveMetadata(itemsToSave, categoryValue, thumbnailUrl) {
    const batch = writeBatch(db);
    const col = collection(db, "media");

    for (const item of itemsToSave) {
      const docRef = doc(col);
      batch.set(docRef, {
        fileUrl: item.url,
        fileName: item.file.name,
        mimeType: item.file.type || null,
        type: guessType(item.file.type),
        category: categoryValue,
        thumbnailUrl: thumbnailUrl ?? null,
        storagePath: item.storagePath || null,
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
  }

  async function handleUpload() {
    if (busy) return;
    setError("");
    if (!uid) return;
    if (!storage || !db) return setError("Firebase is not configured.");
    if (!fileItemsRef.current.length) return setError("Select at least one file to upload.");

    setBusy(true);
    try {
      const categoryValue = category.toLowerCase();
      const base = `uploads/${uid}/${categoryValue}/${Date.now()}`;

      // 1) Upload thumbnail first (if selected)
      let thumbnailUrl = null;
      const thumb = thumbnailRef.current;
      if (thumb) {
        if (thumb.url) {
          thumbnailUrl = thumb.url;
        } else if (thumb.status === "uploading" || thumb.status === "saving") {
          throw new Error("Thumbnail is busy. Please wait.");
        } else {
          try {
            thumbnailUrl = await uploadItem(
              thumb,
              `${base}/thumbnail`,
              (patch) => updateThumbnail(patch)
            );
          } catch (err) {
            updateThumbnail({ status: "error", error: err?.message ?? "Thumbnail upload failed" });
            throw err;
          }
        }
      }

      // 2) Upload files that do not have URLs yet (prevents duplicate uploads)
      const needUpload = fileItemsRef.current.filter(
        (i) => !i.url && i.status !== "uploading" && i.status !== "saving"
      );

      await Promise.all(
        needUpload.map((item) =>
          uploadItem(item, `${base}/files`, (patch) => updateFileItem(item.id, patch)).catch(
            (err) => {
              updateFileItem(item.id, {
                status: "error",
                error: err?.message ?? "Upload failed",
              });
            }
          )
        )
      );

      const afterUpload = fileItemsRef.current;
      const allUploaded = afterUpload.every((i) => Boolean(i.url));
      if (!allUploaded) {
        setError("Some files failed to upload. Fix errors and try again.");
        return;
      }

      // 3) Save Firestore metadata (atomic batch) for items not already saved
      const toSave = afterUpload.filter((i) => i.status !== "saved");
      if (!toSave.length) return;

      toSave.forEach((item) => updateFileItem(item.id, { status: "saving", error: "" }));
      try {
        await saveMetadata(toSave, categoryValue, thumbnailUrl);
        toSave.forEach((item) => updateFileItem(item.id, { status: "saved" }));
        if (thumbnailRef.current?.url) updateThumbnail({ status: "saved" });
      } catch (err) {
        const message = err?.message ?? "Failed to save metadata";
        toSave.forEach((item) => updateFileItem(item.id, { status: "error", error: message }));
        setError(message);
      }
    } catch (err) {
      setError(err?.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <CategorySelect value={category} onChange={setCategory} />

        <FilePicker
          id="upload-files"
          label="Files"
          help="Select one or more files to upload."
          multiple
          onPick={(picked) => {
            setFileItems((prev) => dedupeAppend(prev, picked, "file"));
          }}
          disabled={busy}
        />

        <FilePicker
          id="upload-thumbnail"
          label="Thumbnail (optional)"
          help="Optional image used as a preview thumbnail."
          accept="image/*"
          onPick={(picked) => {
            const f = picked[0] ?? null;
            setThumbnailItem(f ? makeItem(f, "thumbnail") : null);
          }}
          disabled={busy}
        />

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleUpload}
          disabled={!canUpload || busy}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {busy ? "Uploading..." : "Upload"}
        </button>
      </div>

      <div className="space-y-6">
        <FilePreviewList
          title="Selected files"
          items={fileItems}
          onRemoveAt={(index) => {
            setFileItems((prev) => prev.filter((_, i) => i !== index));
          }}
          emptyText="Pick files to see a preview list."
        />

        <FilePreviewList
          title="Thumbnail"
          items={thumbnailItem ? [thumbnailItem] : []}
          onRemoveAt={() => setThumbnailItem(null)}
          emptyText="Optional thumbnail is not selected."
        />
      </div>
    </div>
  );
}

