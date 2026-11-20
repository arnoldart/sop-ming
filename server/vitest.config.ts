import { defineConfig } from 'vitest/config';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/sop_center_test?schema=public';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globalSetup: ['./test/globalSetup.ts'],
    fileParallelism: false,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      SESSION_SECRET: 'test-secret-test-secret-test-secret',
      NODE_ENV: 'test',
      CLIENT_ORIGIN: 'http://localhost:5173',
    },
  },
});
