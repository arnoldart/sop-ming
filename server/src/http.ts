import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { env } from './env.js';

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new AppError(404, 'NOT_FOUND', `${what} tidak ditemukan`);
export const forbidden = (message = 'Anda tidak berwenang untuk aksi ini') =>
  new AppError(403, 'FORBIDDEN', message);
export const conflict = (code: string, message: string) => new AppError(409, code, message);

/** Bungkus handler async agar penolakan promise masuk ke errorHandler. */
export const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) =>
    fn(req, res).catch(next);

/** Validasi input; melempar 422 dengan detail per field. */
export function parse<T extends ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.') || '(root)',
      message: i.message,
    }));
    throw new AppError(422, 'VALIDATION_ERROR', 'Data tidak valid', details);
  }
  return result.data;
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'Data tidak valid', details: err.issues },
    });
  }
  // Prisma unique constraint
  if (typeof err === 'object' && err && (err as { code?: string }).code === 'P2002') {
    return res.status(409).json({
      error: { code: 'CONFLICT', message: 'Data dengan nilai unik tersebut sudah ada' },
    });
  }

  console.error('[unhandled]', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: 'Terjadi kesalahan pada server',
      details: env.NODE_ENV === 'development' ? String(err) : undefined,
    },
  });
}
