import { z, type ZodError, type ZodType } from "zod";
import { badRequest, validationFailed, type FieldErrors } from "./errors";

/** Turns Zod issues into { "field.path": "message" }, keeping the first message per field. */
export function zodFieldErrors(error: ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_";
    fields[key] ??= issue.message;
  }
  return fields;
}

/** Reads and validates a JSON body: 400 if it isn't JSON, 422 if it doesn't match the schema. */
export async function parseBody<S extends ZodType>(req: Request, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw badRequest("The request body must be valid JSON.");
  }
  const result = schema.safeParse(body);
  if (!result.success) throw validationFailed(zodFieldErrors(result.error));
  return result.data;
}

/** Validates query string parameters against a schema (repeated keys become arrays). */
export function parseQuery<S extends ZodType>(req: Request, schema: S): z.output<S> {
  const params = new URL(req.url).searchParams;
  const raw: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    raw[key] = values.length > 1 ? values : values[0];
  }
  const result = schema.safeParse(raw);
  if (!result.success) throw validationFailed(zodFieldErrors(result.error));
  return result.data;
}

/** IDs are cuids; anything else is rejected before it reaches the database. */
export const idSchema = z.cuid({ message: "Invalid id." });

export function parseId(value: string, label = "id"): string {
  const result = idSchema.safeParse(value);
  if (!result.success) throw validationFailed({ [label]: "Invalid id." });
  return result.data;
}
