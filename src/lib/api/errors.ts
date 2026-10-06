/**
 * Errors a route handler can throw to produce a specific HTTP response.
 * `route()` (./handler) turns them into the standard error envelope; anything
 * else becomes a generic 500 so internals never reach the client.
 */

export type ErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation_failed"
  | "rate_limited"
  | "internal_error";

export type FieldErrors = Record<string, string>;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly fields?: FieldErrors,
    /** Extra response headers, e.g. Retry-After on a 429. */
    readonly headers?: Record<string, string>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const badRequest = (message = "The request could not be understood.") =>
  new ApiError(400, "bad_request", message);

export const unauthorized = (message = "Please sign in to continue.") =>
  new ApiError(401, "unauthorized", message);

export const forbidden = (message = "You don't have permission to do that.") =>
  new ApiError(403, "forbidden", message);

export const notFound = (resource = "Resource") => new ApiError(404, "not_found", `${resource} not found.`);

export const conflict = (message: string) => new ApiError(409, "conflict", message);

export const validationFailed = (fields: FieldErrors, message?: string) =>
  new ApiError(422, "validation_failed", message ?? Object.values(fields)[0] ?? "Some fields are invalid.", fields);

export const rateLimited = (retryAfterSeconds: number) =>
  new ApiError(429, "rate_limited", "Too many attempts. Please wait a moment and try again.", undefined, {
    "Retry-After": String(retryAfterSeconds),
  });
