import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { loginSchema } from '@sop/shared';
import { db } from '../db.js';
import { clearSessionCookie, requireAuth, setSessionCookie, signSession } from '../auth.js';
import { audit } from '../audit.js';
import { AppError, parse, wrap } from '../http.js';

export const authRouter = Router();

// ponytail: rate limit in-memory, cukup untuk satu instance demo.
// Ganti ke Redis bila aplikasi dijalankan multi-instance.
const attempts = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 5;
const WINDOW_MS = 60_000;

function rateLimit(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count += 1;
  if (entry.count > LIMIT) {
    throw new AppError(429, 'RATE_LIMITED', 'Terlalu banyak percobaan masuk. Coba lagi dalam satu menit.');
  }
}

authRouter.post(
  '/login',
  wrap(async (req, res) => {
    const { email, password } = parse(loginSchema, req.body);
    rateLimit(`${email}|${req.ip}`);

    const user = await db.user.findUnique({ where: { email }, include: { department: true } });
    const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !valid || !user.isActive) {
      // Pesan sengaja generik agar tidak membocorkan email mana yang terdaftar.
      throw new AppError(401, 'UNAUTHORIZED', 'Email atau password salah');
    }

    setSessionCookie(res, signSession(user.id));
    await audit(req, { actorId: user.id, action: 'AUTH_LOGIN', entityType: 'User', entityId: user.id });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId,
        departmentName: user.department?.name ?? null,
      },
    });
  }),
);

authRouter.post(
  '/logout',
  wrap(async (req, res) => {
    if (req.user) {
      await audit(req, { action: 'AUTH_LOGOUT', entityType: 'User', entityId: req.user.id });
    }
    clearSessionCookie(res);
    res.json({ ok: true });
  }),
);

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
