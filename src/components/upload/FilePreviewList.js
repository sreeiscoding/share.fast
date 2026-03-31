"use client";

import { FilePreviewItem } from "./FilePreviewItem";

export function FilePreviewList({
  title,
  items,
  onRemoveAt,
  emptyText = "No files selected.",
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/60 bg-white p-6 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/30">
      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
        {title}
      </div>
      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
        {items.length ? `${items.length} selected` : emptyText}
      </div>

      {items.length ? (
        <div className="mt-4 space-y-3">
          {items.map((item, index) => (
            <FilePreviewItem
              key={item.id}
              item={item}
              onRemove={() => onRemoveAt(index)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

