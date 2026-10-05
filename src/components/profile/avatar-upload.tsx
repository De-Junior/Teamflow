"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload, Trash2 } from "lucide-react";

const AVATAR_SIZE = 256;

/** Center-crops and downsizes an image file to a square JPEG data URL. */
async function toAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE
  );
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function AvatarUpload({ name, image }: { name: string; image: string | null }) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(image);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const dataUrl = await toAvatarDataUrl(file);
      const res = await fetch("/api/users/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message);
        return;
      }
      setPreview(dataUrl);
      router.refresh();
    } catch {
      setError("That image couldn't be processed. Try a JPG or PNG.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/users/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setPreview(null);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-accent text-xl font-semibold text-accent-foreground">
        {preview ? (
          // A data URL can't benefit from next/image optimisation, so a plain img is correct here.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={name} className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" disabled={loading}>
            <label className="cursor-pointer gap-1.5">
              <Upload className="size-3.5" /> {loading ? "Saving…" : "Upload"}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleUpload} disabled={loading} />
            </label>
          </Button>
          {preview && (
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={handleDelete} disabled={loading}>
              <Trash2 className="size-3.5" /> Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">JPG, PNG or WebP. Cropped to a square.</p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
