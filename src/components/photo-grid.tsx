"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

export function PhotoGrid({
  initial,
  max = 6,
}: {
  initial: string[];
  max?: number;
}) {
  const router = useRouter();
  const [photoIds, setPhotoIds] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Pick an image.");
      return;
    }
    setBusy("__upload__");
    try {
      const data_b64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onerror = () => reject(r.error);
        r.onload = () => resolve(typeof r.result === "string" ? r.result : "");
        r.readAsDataURL(file);
      });
      const res = await fetch("/api/profile/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data_b64, content_type: file.type }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? `Upload failed (${res.status}).`);
        return;
      }
      const data = (await res.json()) as { photo_id: string };
      setPhotoIds((ids) => [...ids, data.photo_id]);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function remove(photoId: string) {
    setError(null);
    setBusy(photoId);
    try {
      const res = await fetch(
        `/api/profile/photos/${encodeURIComponent(photoId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? `Remove failed (${res.status}).`);
        return;
      }
      setPhotoIds((ids) => ids.filter((id) => id !== photoId));
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <ul className="grid grid-cols-3 gap-2">
        {photoIds.map((id, i) => (
          <li
            key={id}
            className="relative aspect-square overflow-hidden rounded-2xl bg-[color:var(--muted)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/photos/${encodeURIComponent(id)}`}
              alt={i === 0 ? "Your main photo" : `Photo ${i + 1}`}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => remove(id)}
              disabled={busy === id}
              aria-label="Remove photo"
              className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white backdrop-blur disabled:opacity-50"
            >
              ×
            </button>
          </li>
        ))}
        {photoIds.length < max ? (
          <li className="aspect-square">
            <label
              className={cn(
                "flex h-full w-full cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-[color:var(--border)] text-2xl text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]",
                busy === "__upload__" && "opacity-50",
              )}
            >
              {busy === "__upload__" ? "…" : "+"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={busy !== null}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) upload(file);
                  e.target.value = "";
                }}
              />
            </label>
          </li>
        ) : null}
      </ul>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
