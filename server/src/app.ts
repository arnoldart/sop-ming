import cookieParser from 'cookie-parser';
import express from 'express';
import { attachUser } from './auth.js';
import { env } from './env.js';
import { AppError, errorHandler } from './http.js';
import { announcementRouter } from './routes/announcements.js';
import { auditRouter } from './routes/auditLogs.js';
import { authRouter } from './routes/auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { reportRouter } from './routes/reports.js';
import { sopRouter } from './routes/sops.js';
import { userRouter } from './routes/users.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // CSRF sederhana: cookie SameSite=Lax + tolak mutasi dari origin lain.
  app.use((req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.get('origin');
    if (origin && origin !== env.CLIENT_ORIGIN) {
      return next(new AppError(403, 'FORBIDDEN', 'Origin tidak diizinkan'));
    }
    next();
  });

  app.use('/api', attachUser);
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRouter);
  app.use('/api/sops', sopRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/announcements', announcementRouter);
  app.use('/api/reports', reportRouter);
  app.use('/api/audit-logs', auditRouter);
  app.use('/api/users', userRouter);

  app.use((_req, _res, next) => next(new AppError(404, 'NOT_FOUND', 'Endpoint tidak ditemukan')));
  app.use(errorHandler);

  return app;
}
