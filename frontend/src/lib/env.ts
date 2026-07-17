// Central, validated view of the frontend's environment.
//
// Reading `process.env.FOO` ad-hoc scatters the "is this set / is it a URL?"
// question across the codebase and only blows up deep inside a request. This
// module parses the whole environment once, with zod, and fails fast at import
// time — naming *every* offending key at once so a broken `.env.local` (or a
// missing Vercel/CI var) surfaces immediately.
//
// It reads DRUPAL_CLIENT_SECRET, so it must never reach the browser bundle.
import 'server-only';

import { z } from 'zod';

const envSchema = z.object({
  DRUPAL_BASE_URL: z.string().url(),
  NEXT_PUBLIC_DRUPAL_BASE_URL: z.string().url(),
  DRUPAL_CLIENT_ID: z.string().min(1),
  DRUPAL_CLIENT_SECRET: z.string().min(1),
  DRUPAL_PREVIEW_SECRET: z.string().min(1),
  NEXT_PUBLIC_FRONTEND_URL: z.string().url(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate an environment source (defaults to `process.env`).
 * Throws an Error listing every invalid/missing key when validation fails.
 */
export function parseEnv(
  source: Record<string, string | undefined> = process.env,
): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const keys = Array.from(
      new Set(result.error.issues.map((issue) => String(issue.path[0]))),
    );
    throw new Error(
      `Invalid frontend environment configuration. Fix these variable(s): ` +
        `${keys.join(', ')}. See frontend/.env.local.example.`,
    );
  }
  return result.data;
}

/** Parsed, typed environment. Importing this validates the environment. */
export const env: Env = parseEnv();
