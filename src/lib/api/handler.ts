import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { UnauthorizedError } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import { ApiError, validationFailed } from "./errors";
import { zodFieldErrors } from "./request";

/**
 * The response envelope every API route uses:
 *   success → { success: true, data }
 *   failure → { success: false, code, message, fields? }
 */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export const created = <T>(data: T) => ok(data, 201);

type RouteContext<P> = { params: P; requestId: string };
type Handler<P> = (req: Request, ctx: RouteContext<P>) => Promise<Response>;

/**
 * Wraps a route handler so that every thrown error becomes a consistent JSON
 * response, every response carries an `X-Request-Id`, and unexpected failures
 * are logged with that id instead of leaking details to the client.
 *
 *   export const GET = route("projects.list", async (req) => ok(await listProjects()));
 */
export function route<P extends Record<string, string> = Record<string, never>>(name: string, handler: Handler<P>) {
  return async (req: Request, context?: { params?: Promise<P> }) => {
    const requestId = crypto.randomUUID();
    let response: Response;
    try {
      const params = (context?.params ? await context.params : {}) as P;
      response = await handler(req, { params, requestId });
    } catch (error) {
      response = errorResponse(normalize(error), { name, requestId, method: req.method, cause: error });
    }
    response.headers.set("X-Request-Id", requestId);
    return response;
  };
}

/** Maps anything thrown inside a handler to an ApiError, or null for "unexpected". */
function normalize(error: unknown): ApiError | null {
  if (error instanceof ApiError) return error;
  if (error instanceof UnauthorizedError) return new ApiError(403, "forbidden", error.message);
  if (error instanceof ZodError) return validationFailed(zodFieldErrors(error));
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2025: a write targeted a row that doesn't exist (or isn't in this tenant).
    if (error.code === "P2025") return new ApiError(404, "not_found", "Resource not found.");
    // P2002 / P2003: unique or foreign-key constraint, i.e. the request conflicts with existing data.
    if (error.code === "P2002") return new ApiError(409, "conflict", "That already exists.");
    if (error.code === "P2003") return new ApiError(409, "conflict", "That refers to something that no longer exists.");
  }
  return null;
}

function errorResponse(
  error: ApiError | null,
  meta: { name: string; requestId: string; method: string; cause: unknown }
) {
  if (!error) {
    logger.error("api.unhandled_error", { route: meta.name, method: meta.method, requestId: meta.requestId, error: meta.cause });
    return NextResponse.json(
      { success: false, code: "internal_error", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  if (error.status === 401 || error.status === 403 || error.status === 429) {
    logger.warn("api.access_denied", { route: meta.name, method: meta.method, requestId: meta.requestId, status: error.status });
  }

  return NextResponse.json(
    { success: false, code: error.code, message: error.message, ...(error.fields && { fields: error.fields }) },
    { status: error.status, headers: error.headers }
  );
}
