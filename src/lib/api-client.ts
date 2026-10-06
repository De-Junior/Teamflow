/**
 * Browser-side client for the app's own API. Every route answers with
 *   { success: true, data } or { success: false, code, message, fields? }
 * so this unwraps `data` on success and throws an ApiClientError otherwise.
 * Components then only deal with the happy path plus one error type.
 */

export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "gone"
  | "validation_failed"
  | "rate_limited"
  | "internal_error"
  | "network_error";

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    /** Per-field messages for 422 responses, keyed like the request body. */
    readonly fields?: Record<string, string>
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

const FALLBACK_MESSAGE = "Something went wrong. Please try again.";

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiClientError(0, "network_error", "Couldn't reach TeamFlow. Check your connection and try again.");
  }

  const json = await res.json().catch(() => null);
  if (res.ok && json?.success) return json.data as T;

  throw new ApiClientError(
    res.status,
    json?.code ?? (res.status >= 500 ? "internal_error" : "bad_request"),
    json?.message ?? FALLBACK_MESSAGE,
    json?.fields
  );
}

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body?: unknown) => request<T>("POST", url, body ?? {}),
  patch: <T>(url: string, body: unknown) => request<T>("PATCH", url, body),
  put: <T>(url: string, body: unknown) => request<T>("PUT", url, body),
  delete: <T = unknown>(url: string, body?: unknown) => request<T>("DELETE", url, body),
};

/** The server's message for one field of a 422, if it sent one. */
export function fieldError(error: unknown, field: string): string | undefined {
  return error instanceof ApiClientError ? error.fields?.[field] : undefined;
}

/** The message to show for anything a request threw. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiClientError ? error.message : FALLBACK_MESSAGE;
}
