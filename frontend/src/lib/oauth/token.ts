// In-process bearer-token cache for the OAuth2 client_credentials grant.
//
// Used by the JSON:API client when it needs to read drafts (preview mode) or
// any resource the public anonymous role can't see. The frontend is the
// only "user" — there is no per-end-user token here.
//
// Cache lifetime: one Node process. On Vercel that's one lambda instance —
// fine, the cost is one /oauth/token round-trip per cold start.

import 'server-only';

import { env } from '@/lib/env';

interface CachedToken {
  accessToken: string;
  /** Unix epoch (ms) when the token actually expires. */
  expiresAt: number;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

// Module-level cache keyed by client_id. Multiple consumers in one process
// (eg. a marketing app + a docs app sharing this lib) get their own slots.
const cache = new Map<string, CachedToken>();

/**
 * Refresh 60s before the actual expiry — covers clock skew + the round-trip
 * needed to mint a fresh token without blocking a downstream request.
 */
const SAFETY_WINDOW_MS = 60_000;

interface GetTokenOptions {
  baseUrl?: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
}

export async function getClientCredentialsToken(
  opts: GetTokenOptions = {},
): Promise<string> {
  const baseUrl = opts.baseUrl ?? env.DRUPAL_BASE_URL;
  const clientId = opts.clientId ?? env.DRUPAL_CLIENT_ID;
  const clientSecret = opts.clientSecret ?? env.DRUPAL_CLIENT_SECRET;
  const { scope } = opts;

  const cached = cache.get(clientId);
  if (cached && cached.expiresAt - SAFETY_WINDOW_MS > Date.now()) {
    return cached.accessToken;
  }

  const url = new URL('/oauth/token', baseUrl).toString();
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });
  if (scope) {
    body.set('scope', scope);
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
    // Token requests don't get cached by Next's data cache; they're fresh
    // every cold start and reused inside the process.
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new OAuthError(
      `OAuth token request failed: ${res.status} ${res.statusText} — ${text.slice(0, 200)}`,
      res.status,
    );
  }

  const json = (await res.json()) as TokenResponse;
  if (!json.access_token || typeof json.expires_in !== 'number') {
    throw new OAuthError(
      'OAuth token response missing access_token or expires_in',
      500,
    );
  }

  cache.set(clientId, {
    accessToken: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  });

  return json.access_token;
}

/** Invalidate the cached token — useful in tests or when a 401 comes back. */
export function invalidateToken(clientId: string): void {
  cache.delete(clientId);
}

export class OAuthError extends Error {
  public readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'OAuthError';
    this.status = status;
  }
}
