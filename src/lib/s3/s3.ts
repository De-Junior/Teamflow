// PASTE LOCATION: src/lib/s3.ts (new file)

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";

const region = process.env.AWS_REGION;
const bucket = process.env.AWS_S3_BUCKET;

if (!region || !bucket) {
  throw new Error("Missing AWS_REGION or AWS_S3_BUCKET environment variables");
}

export const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const S3_BUCKET = bucket;
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

export const ALLOWED_MIME_TYPES = [
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
] as const;

const PREVIEWABLE_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

export function isPreviewable(mimeType: string) {
  return PREVIEWABLE_MIME_TYPES.has(mimeType);
}

function sanitizeFileName(fileName: string) {
  // Strip path separators and anything unsafe in a URL/S3 key. Keeps the
  // extension readable while preventing directory traversal via filename.
  const base = fileName.split(/[/\\]/).pop() ?? "file";
  return base.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-150);
}

/**
 * Every key is prefixed with tenants/{tenantId}/, which is what makes
 * cross-tenant access structurally impossible rather than something we have
 * to remember to check everywhere: assertKeyBelongsToTenant() below verifies
 * this prefix on every confirm/download/delete call before trusting a key
 * the client sends back.
 */
export function buildObjectKey(params: {
  tenantId: string;
  projectId?: string;
  taskId?: string;
  fileName: string;
}) {
  const safeName = sanitizeFileName(params.fileName);
  const scope = params.taskId
    ? `tasks/${params.taskId}`
    : params.projectId
      ? `projects/${params.projectId}`
      : "misc";
  return `tenants/${params.tenantId}/${scope}/${nanoid(12)}-${safeName}`;
}

export function assertKeyBelongsToTenant(key: string, tenantId: string) {
  if (!key.startsWith(`tenants/${tenantId}/`)) {
    throw new Error("Object key does not belong to the current tenant");
  }
}

export async function createPresignedUploadUrl(params: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}) {
  // Signing ContentType here means the browser's PUT request must send a
  // matching Content-Type header or S3 will reject the signature — this is
  // what stops a client from silently swapping the file type after presign.
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: params.key,
    ContentType: params.contentType,
  });
  return getSignedUrl(s3Client, command, {
    expiresIn: params.expiresInSeconds ?? 300, // 5 minutes
  });
}

export async function createPresignedDownloadUrl(params: {
  key: string;
  fileName: string;
  disposition: "inline" | "attachment";
  expiresInSeconds?: number;
}) {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: params.key,
    ResponseContentDisposition: `${params.disposition}; filename="${params.fileName}"`,
  });
  return getSignedUrl(s3Client, command, {
    expiresIn: params.expiresInSeconds ?? 300,
  });
}

/**
 * Reads the object's real size/content-type back from S3. The confirm route
 * uses this instead of trusting the client-supplied size, since a presigned
 * PUT URL does not by itself enforce a size limit (that requires a presigned
 * POST policy, which trades simplicity for that guarantee — see SETUP.md).
 */
export async function headObject(key: string) {
  const command = new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key });
  const result = await s3Client.send(command);
  return {
    size: result.ContentLength ?? 0,
    contentType: result.ContentType ?? "application/octet-stream",
  };
}

export async function deleteObject(key: string) {
  await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}