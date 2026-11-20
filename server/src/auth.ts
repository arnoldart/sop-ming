import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role, SessionUser } from '@sop/shared';
import { db } from './db.js';
import { env } from './env.js';
import { forbidden, AppError } from './http.js';
import { can, type Permission } from './policy.js';

export const SESSION_COOKIE = 'sop_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

export function signSession(userId: string): string {
  return jwt.sign({ sub: userId }, env.SESSION_SECRET, { expiresIn: '8h' });
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

/** Muat user dari cookie. Tidak melempar bila belum login — cukup biarkan req.user kosong. */
export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.SESSION_SECRET) as { sub: string };
    const user = await db.user.findUnique({
      where: { id: payload.sub },
      include: { department: true },
    });
    if (user?.isActive) {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as Role,
        departmentId: user.departmentId,
        departmentName: user.department?.name ?? null,
      };
    }
  } catch {
    // token kedaluwarsa/rusak → diperlakukan sebagai belum login
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', 'Silakan masuk terlebih dahulu'));
  next();
}

export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', 'Silakan masuk terlebih dahulu'));
    if (!can(req.user.role, permission)) return next(forbidden());
    next();
  };
}

/** Untuk uji negatif: memastikan role tertentu selalu ditolak. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', 'Silakan masuk terlebih dahulu'));
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}
