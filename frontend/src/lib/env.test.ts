import { describe, expect, it } from 'vitest';

import { parseEnv } from './env';

const VALID: Record<string, string> = {
  DRUPAL_BASE_URL: 'http://drupal.local',
  NEXT_PUBLIC_DRUPAL_BASE_URL: 'https://drupal.example',
  DRUPAL_CLIENT_ID: 'nextjs-frontend',
  DRUPAL_CLIENT_SECRET: 'shhh',
  DRUPAL_PREVIEW_SECRET: 'preview-secret',
  DRUPAL_REVALIDATE_SECRET: 'revalidate-secret',
  NEXT_PUBLIC_FRONTEND_URL: 'http://localhost:3000',
};

describe('parseEnv', () => {
  it('parses a complete, valid environment', () => {
    const env = parseEnv(VALID);
    expect(env.DRUPAL_BASE_URL).toBe('http://drupal.local');
    expect(env.DRUPAL_CLIENT_ID).toBe('nextjs-frontend');
    expect(env.DRUPAL_CLIENT_SECRET).toBe('shhh');
    expect(env.NEXT_PUBLIC_FRONTEND_URL).toBe('http://localhost:3000');
  });

  it('throws naming the missing secret', () => {
    const { DRUPAL_CLIENT_SECRET: _secret, ...missing } = VALID;
    expect(() => parseEnv(missing)).toThrow(/DRUPAL_CLIENT_SECRET/);
  });

  it('names every missing key at once', () => {
    let message = '';
    try {
      parseEnv({});
    } catch (err) {
      message = (err as Error).message;
    }
    for (const key of Object.keys(VALID)) {
      expect(message).toContain(key);
    }
  });

  it('rejects a malformed URL', () => {
    expect(() => parseEnv({ ...VALID, DRUPAL_BASE_URL: 'not-a-url' })).toThrow(
      /DRUPAL_BASE_URL/,
    );
  });
});
