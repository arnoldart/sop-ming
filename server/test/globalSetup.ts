import { execSync } from 'node:child_process';
import path from 'node:path';

/**
 * Menyiapkan database uji terpisah (sop_center_test) sekali sebelum seluruh suite.
 * Tidak menyentuh database pengembangan.
 */
export default function setup() {
  const url =
    process.env.TEST_DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/sop_center_test?schema=public';

  const cwd = path.resolve(import.meta.dirname, '..');
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd,
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: url },
  });
}
