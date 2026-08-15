import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Vitest runs in a plain Node context, so a couple of Next-isms need bridging:
//   - `server-only` is an ambient module Next resolves at build time; it has no
//     runtime implementation, so alias it to an empty stub.
//   - the `@/…` path alias mirrors tsconfig's `paths` mapping.
// The `test.env` block provides the same fallback vars CI sets, so importing
// modules that validate env at load time (src/lib/env.ts) does not throw.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      DRUPAL_BASE_URL: 'http://localhost',
      NEXT_PUBLIC_DRUPAL_BASE_URL: 'http://localhost',
      NEXT_PUBLIC_FRONTEND_URL: 'http://localhost:3000',
      DRUPAL_CLIENT_ID: 'test-client',
      DRUPAL_CLIENT_SECRET: 'test-secret',
      DRUPAL_PREVIEW_SECRET: 'test-preview',
      DRUPAL_REVALIDATE_SECRET: 'test-revalidate',
    },
  },
  resolve: {
    alias: {
      'server-only': fileURLToPath(
        new URL('./test/stubs/server-only.ts', import.meta.url),
      ),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
