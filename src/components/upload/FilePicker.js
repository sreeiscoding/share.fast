"use client";

export function FilePicker({
  id,
  label,
  help,
  accept,
  multiple = false,
  onPick,
  disabled = false,
}) {
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
        <label
          htmlFor={id}
          className={`inline-flex cursor-pointer items-center justify-center rounded-full px-4 py-2 text-sm font-medium ${
            disabled
              ? "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500 cursor-not-allowed"
              : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          }`}
        >
          Choose
        </label>
      </div>

      <input
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          onPick(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

