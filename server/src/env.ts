import 'dotenv/config';

export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  SESSION_SECRET: process.env.SESSION_SECRET ?? 'dev-only-secret-change-me-please-32chars',
  PORT: Number(process.env.PORT ?? 4000),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
};

if (!env.DATABASE_URL) {
  throw new Error('DATABASE_URL belum diisi. Salin server/.env.example ke server/.env');
}
