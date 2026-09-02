import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Two test projects share one config:
//
//   node — pure logic (src/**/*.test.ts): query builders, mappers, OAuth,
//          route handlers. No DOM, fastest to run.
//   dom  — React components (src/**/*.test.tsx) under jsdom + Testing Library.
//
// A couple of Next-isms need bridging in both:
//   - `server-only` is an ambient module Next resolves at build time; it has no
//     runtime implementation, so alias it to an empty stub.
//   - the `@/…` path alias mirrors tsconfig's `paths` mapping.
// The `env` block provides the same fallback vars CI sets, so importing modules
// that validate env at load time (src/lib/env.ts) does not throw.

const testEnv = {
  DRUPAL_BASE_URL: 'http://localhost',
  NEXT_PUBLIC_DRUPAL_BASE_URL: 'http://localhost',
  NEXT_PUBLIC_FRONTEND_URL: 'http://localhost:3000',
  DRUPAL_CLIENT_ID: 'test-client',
  DRUPAL_CLIENT_SECRET: 'test-secret',
  DRUPAL_PREVIEW_SECRET: 'test-preview',
  DRUPAL_REVALIDATE_SECRET: 'test-revalidate',
};

const resolve = {
  alias: {
    'server-only': fileURLToPath(
      new URL('./test/stubs/server-only.ts', import.meta.url),
    ),
    '@': fileURLToPath(new URL('./src', import.meta.url)),
  },
};

export default defineConfig({
  test: {
    projects: [
      {
        resolve,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          env: testEnv,
        },
      },
      {
        // Next compiles JSX itself; Vitest does not, so the dom project needs
        // an explicit React transform.
        plugins: [react()],
        resolve,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          setupFiles: ['./test/setup-dom.ts'],
          env: testEnv,
        },
      },
    ],
  },
});
