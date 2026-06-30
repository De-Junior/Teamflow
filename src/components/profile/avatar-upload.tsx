// PASTE LOCATION: src/components/profile/avatar-upload.tsx (overwrite entire file — fixes FormData for real upload later)
"use client";

import { useState } from "react";
import { Button }   from "@/components/ui/button";
import { Upload, Trash2 } from "lucide-react";

export function AvatarUpload({ name, image }: { name: string; image: string | null }) {
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const initials = name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null); setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res  = await fetch("/api/users/avatar", { method: "POST", body: formData });
      const json = await res.json();
      if (!json.success) { setError(json.message); return; }
      window.location.reload();
    } catch {
      setError("Something went wrong.");
    } finally { setLoading(false); e.target.value = ""; }
  }

  async function handleDelete() {
    setError(null); setLoading(true);
    try {
      await fetch("/api/users/avatar", { method: "DELETE" });
      window.location.reload();
    } catch {
      setError("Something went wrong.");
    } finally { setLoading(false); }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-accent text-xl font-semibold text-accent-foreground">
        {image ? <img src={image} alt={name} className="h-full w-full object-cover" /> : initials}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" disabled={loading}>
            <label className="cursor-pointer gap-1.5">
              <Upload className="size-3.5" /> Upload
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={loading} />
            </label>
          </Button>
          {image && (
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={handleDelete} disabled={loading}>
              <Trash2 className="size-3.5" /> Remove
            </Button>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}