import { defineConfig, devices } from '@playwright/test';

// The suite runs against a real production build (`next build && next start`)
// talking to a real HTTP mock of Drupal — not `next dev`, and not an in-process
// fetch stub. Dev mode papers over hydration and caching differences, and a
// fetch stub would remove the OAuth handshake and zod validation from the path,
// which is most of what there is to get wrong in this integration.

const MOCK_DRUPAL_PORT = 4001;
const APP_PORT = 3100;

const backendEnv = {
  DRUPAL_BASE_URL: `http://localhost:${MOCK_DRUPAL_PORT}`,
  NEXT_PUBLIC_DRUPAL_BASE_URL: `http://localhost:${MOCK_DRUPAL_PORT}`,
  NEXT_PUBLIC_FRONTEND_URL: `http://localhost:${APP_PORT}`,
  DRUPAL_CLIENT_ID: 'e2e-client',
  DRUPAL_CLIENT_SECRET: 'e2e-secret',
  DRUPAL_PREVIEW_SECRET: 'e2e-preview-secret',
  DRUPAL_REVALIDATE_SECRET: 'e2e-revalidate-secret',
};

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Under `exactOptionalPropertyTypes` the key must be omitted, not set to
  // undefined, to mean "let Playwright decide".
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: [
    {
      command: 'node e2e/mock-drupal/server.mjs',
      port: MOCK_DRUPAL_PORT,
      reuseExistingServer: !process.env.CI,
      env: { MOCK_DRUPAL_PORT: String(MOCK_DRUPAL_PORT) },
    },
    {
      command: `pnpm build && pnpm start -p ${APP_PORT}`,
      port: APP_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: backendEnv,
    },
  ],
});
