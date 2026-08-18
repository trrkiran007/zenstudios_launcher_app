import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { z, ZodError } from 'zod';

/** Wrap an async handler so rejected promises reach the error middleware. */
export function h(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const notFound = (what: string) => new HttpError(404, `${what} not found`);
export const badRequest = (msg: string) => new HttpError(400, msg);

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  const message = err instanceof Error ? err.message : 'Unexpected server error';
  console.error('[api]', err);
  res.status(500).json({ error: message });
}

/**
 * Parse a partial-update body, keeping only the fields the client actually sent.
 *
 * Zod's `.partial()` makes keys optional but does NOT strip `.default()`, so a
 * plain `schema.partial().parse(body)` quietly injects a default for every
 * omitted field. That turns "update the rate" into "update the rate and also
 * reset the unit to Nos, the GST rate to 18% and the active flag to true".
 * Always use this for PUT/PATCH handlers that accept a subset of fields.
 */
export function parsePatch<S extends z.ZodObject<any>>(schema: S, body: unknown): Partial<z.infer<S>> {
  const parsed = schema.partial().parse(body ?? {}) as Record<string, unknown>;
  const sent = new Set(Object.keys((body ?? {}) as Record<string, unknown>));
  for (const key of Object.keys(parsed)) if (!sent.has(key)) delete parsed[key];
  return parsed as Partial<z.infer<S>>;
}

/** Accepts "", null, or an ISO/date string and returns a Date or null. */
export function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}
