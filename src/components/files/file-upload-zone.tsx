// PASTE LOCATION: src/components/files/file-upload-zone.tsx (new file)
"use client";

import { useCallback, useId, useState } from "react";
import { Upload, X, AlertCircle } from "lucide-react";
import { useUploadFile } from "@/hooks/use-files";
import { cn } from "@/lib/utils";

// Mirrors src/lib/s3.ts — kept duplicated (not imported) since this is a
// client component and that file touches server-only AWS SDK code.
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
];

type UploadItem = {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
};

export function FileUploadZone({ projectId, taskId }: { projectId?: string; taskId?: string }) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const { mutateAsync: uploadFile } = useUploadFile({ projectId, taskId });

  const validate = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE_BYTES) return "File exceeds the 25MB limit.";
    if (!ALLOWED_MIME_TYPES.includes(file.type)) return "File type isn't supported.";
    return null;
  };

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;

      Array.from(fileList).forEach((file) => {
        const id = `${file.name}-${Date.now()}-${Math.random()}`;
        const validationError = validate(file);

        if (validationError) {
          setItems((prev) => [...prev, { id, file, progress: 0, status: "error", error: validationError }]);
          return;
        }

        setItems((prev) => [...prev, { id, file, progress: 0, status: "uploading" }]);

        uploadFile({
          file,
          onProgress: (percent) =>
            setItems((prev) => prev.map((item) => (item.id === id ? { ...item, progress: percent } : item))),
        })
          .then(() => {
            setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: "done", progress: 100 } : item)));
            // The completed file now lives in the attachment list query, so
            // clear it from this local upload-in-progress list shortly after.
            setTimeout(() => setItems((prev) => prev.filter((item) => item.id !== id)), 1500);
          })
          .catch((error: Error) => {
            setItems((prev) =>
              prev.map((item) => (item.id === id ? { ...item, status: "error", error: error.message } : item))
            );
          });
      });
    },
    [uploadFile]
  );

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <label
          htmlFor={inputId}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/40"
          )}
        >
          <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-muted-foreground">Images, PDFs, and documents up to 25MB</p>
          <input
            id={inputId}
            type="file"
            multiple
            className="sr-only"
            accept={ALLOWED_MIME_TYPES.join(",")}
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
              {item.status === "error" && (
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
              )}
              <span className="flex-1 truncate">{item.file.name}</span>
              {item.status === "uploading" && (
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${item.progress}%` }} />
                </div>
              )}
              {item.status === "error" && <span className="text-xs text-destructive">{item.error}</span>}
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${item.file.name} from list`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}