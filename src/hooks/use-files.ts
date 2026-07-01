// PASTE LOCATION: src/hooks/use-files.ts (new file)
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type FileAttachment = {
  id: string;
  name: string;
  key: string;
  size: number;
  mimeType: string;
  createdAt: string;
  uploadedById: string;
  uploadedBy: { id: string; name: string | null; image: string | null };
};

type FileScope = { projectId?: string; taskId?: string };

function scopeQueryKey(scope: FileScope) {
  return ["files", scope.projectId ?? null, scope.taskId ?? null] as const;
}

export function useFiles(scope: FileScope) {
  return useQuery({
    queryKey: scopeQueryKey(scope),
    queryFn: async (): Promise<FileAttachment[]> => {
      const params = new URLSearchParams();
      if (scope.projectId) params.set("projectId", scope.projectId);
      if (scope.taskId) params.set("taskId", scope.taskId);

      const res = await fetch(`/api/files?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to load files");
      return json.data;
    },
    enabled: Boolean(scope.projectId || scope.taskId),
  });
}

export function useUploadFile(scope: FileScope) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (percent: number) => void;
    }): Promise<FileAttachment> => {
      // 1. Ask the server for a presigned upload URL. This also validates
      //    type/size and checks upload permission before any bytes move.
      const presignRes = await fetch("/api/files/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          size: file.size,
          ...scope,
        }),
      });
      const presignJson = await presignRes.json();
      if (!presignJson.success) throw new Error(presignJson.message ?? "Could not start upload");
      const { uploadUrl, key } = presignJson.data;

      // 2. Upload directly to S3. XHR (not fetch) is used here specifically
      //    because fetch has no upload progress event.
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            onProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error("Upload to storage failed"));
        xhr.onerror = () => reject(new Error("Upload to storage failed"));
        xhr.send(file);
      });

      // 3. Confirm the upload so the server records it in Postgres (and
      //    verifies the real object against S3 before doing so).
      const confirmRes = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, name: file.name, ...scope }),
      });
      const confirmJson = await confirmRes.json();
      if (!confirmJson.success) throw new Error(confirmJson.message ?? "Could not save file");
      return confirmJson.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scopeQueryKey(scope) });
    },
  });
}

export function useDeleteFile(scope: FileScope) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileId: string) => {
      const res = await fetch(`/api/files/${fileId}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Could not delete file");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scopeQueryKey(scope) });
    },
  });
}

export function getFilePreviewUrl(fileId: string) {
  return `/api/files/${fileId}?redirect=true`;
}

export function getFileDownloadUrl(fileId: string) {
  return `/api/files/${fileId}?redirect=true&download=true`;
}