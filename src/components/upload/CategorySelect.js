"use client";

const categories = ["Intro", "Body", "Outro"];

export function CategorySelect({ value, onChange }) {
  return (
    <div className="rounded-2xl border border-zinc-200/60 bg-white p-6 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/30">
      <label className="block">
        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Category
        </div>
        <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Choose where these files belong.
        </div>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-4 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-50 dark:focus:border-zinc-600"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

