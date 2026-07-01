/* eslint-disable react/no-unescaped-entities */
// PASTE LOCATION: src/components/files/file-attachment-list.tsx (new file)
"use client";

import { useState } from "react";
import { FileText, FileImage, FileSpreadsheet, File as FileIcon, Download, Trash2, X } from "lucide-react";
import {
  useFiles,
  useDeleteFile,
  getFilePreviewUrl,
  getFileDownloadUrl,
  type FileAttachment,
} from "@/hooks/use-files";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <FileImage className="h-5 w-5 text-muted-foreground" />;
  if (mimeType === "application/pdf") return <FileText className="h-5 w-5 text-muted-foreground" />;
  if (mimeType.includes("sheet") || mimeType.includes("excel"))
    return <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />;
  return <FileIcon className="h-5 w-5 text-muted-foreground" />;
}

const PREVIEWABLE = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf"]);

export function FileAttachmentList({
  projectId,
  taskId,
  currentUserId,
  canManageAll = false,
}: {
  projectId?: string;
  taskId?: string;
  currentUserId: string;
  /** True for Owner/Manager — lets them delete files they didn't upload. */
  canManageAll?: boolean;
}) {
  const { data: files, isLoading, isError } = useFiles({ projectId, taskId });
  const { mutate: deleteFile, isPending: isDeleting } = useDeleteFile({ projectId, taskId });
  const [previewFile, setPreviewFile] = useState<FileAttachment | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-destructive">Couldn't load attachments. Try refreshing the page.</p>;
  }

  if (!files || files.length === 0) {
    return <p className="text-sm text-muted-foreground">No files attached yet.</p>;
  }

  return (
    <>
      <ul className="space-y-1.5">
        {files.map((file) => {
          const canDelete = canManageAll || file.uploadedById === currentUserId;
          const isImagePreviewable = PREVIEWABLE.has(file.mimeType);

          return (
            <li key={file.id} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm hover:bg-muted/50">
              <button
                type="button"
                onClick={() => isImagePreviewable && setPreviewFile(file)}
                disabled={!isImagePreviewable}
                className={cn("flex flex-1 items-center gap-3 text-left", isImagePreviewable && "cursor-pointer")}
              >
                <FileTypeIcon mimeType={file.mimeType} />
                <span className="flex-1 truncate">{file.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(file.size)}</span>
              </button>

              <a
                href={getFileDownloadUrl(file.id)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Download ${file.name}`}
              >
                <Download className="h-4 w-4" />
              </a>

              {canDelete && (
                <button
                  type="button"
                  onClick={() => deleteFile(file.id)}
                  disabled={isDeleting}
                  className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                  aria-label={`Delete ${file.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setPreviewFile(null)}
        >
          <div className="relative max-h-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewFile(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white"
              aria-label="Close preview"
            >
              <X className="h-6 w-6" />
            </button>
            {previewFile.mimeType === "application/pdf" ? (
              <iframe
                src={getFilePreviewUrl(previewFile.id)}
                title={previewFile.name}
                className="h-[80vh] w-[80vw] rounded-md bg-white"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- presigned URL, not a static asset Next can optimize
              <img
                src={getFilePreviewUrl(previewFile.id)}
                alt={previewFile.name}
                className="max-h-[80vh] max-w-[80vw] rounded-md object-contain"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}