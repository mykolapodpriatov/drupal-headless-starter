// OAuth2 Authorization Code + PKCE callback.
//
// Validates `state` against the cookie, exchanges the auth code + PKCE
// verifier for an access token at Drupal's /oauth/token endpoint, stows the
// token in an HttpOnly session cookie, and redirects to the originally-
// requested path.

import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PKCE_COOKIE = 'oauth_pkce_verifier';
const STATE_COOKIE = 'oauth_state';
const RETURN_COOKIE = 'oauth_return_to';
const SESSION_COOKIE = 'oauth_session';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

function bad(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const drupalUrl = process.env.NEXT_PUBLIC_DRUPAL_BASE_URL;
  const clientId = process.env.DRUPAL_CLIENT_ID;
  const clientSecret = process.env.DRUPAL_CLIENT_SECRET;
  const frontendUrl =
    process.env.NEXT_PUBLIC_FRONTEND_URL ?? new URL(req.url).origin;

  if (!drupalUrl || !clientId) {
    return bad('OAuth not configured.', 500);
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return bad(
      `Drupal returned ${error}: ${searchParams.get('error_description') ?? ''}`,
    );
  }
  if (!code || !state) {
    return bad('Missing code or state.');
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  const verifier = cookieStore.get(PKCE_COOKIE)?.value;
  const returnTo = cookieStore.get(RETURN_COOKIE)?.value ?? '/';

  if (!expectedState || expectedState !== state) {
    return bad('State mismatch — possible CSRF.', 401);
  }
  if (!verifier) {
    return bad('PKCE verifier missing — start the flow again.', 401);
  }

  // Exchange the code for a token.
  const tokenUrl = new URL('/oauth/token', drupalUrl).toString();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    code,
    redirect_uri: `${frontendUrl}/api/auth/callback`,
    code_verifier: verifier,
  });
  // Confidential clients still send the secret for PKCE in simple_oauth.
  if (clientSecret) {
    body.set('client_secret', clientSecret);
  }

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
    cache: 'no-store',
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text().catch(() => '');
    return bad(
      `Token exchange failed: ${tokenRes.status} ${tokenRes.statusText} — ${text.slice(0, 200)}`,
      502,
    );
  }

  const token = (await tokenRes.json()) as TokenResponse;
  if (!token.access_token) {
    return bad('Token response missing access_token.', 502);
  }

  const safeReturn =
    returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
  const response = NextResponse.redirect(new URL(safeReturn, req.url));

  // Stash the token. In a real app you'd probably keep this server-side
  // (encrypted session, KV, JWE cookie) — this starter just uses an HttpOnly
  // cookie scoped to the path, expiring with the token.
  response.cookies.set(SESSION_COOKIE, token.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: token.expires_in,
  });

  // Clean up the transient cookies.
  for (const name of [PKCE_COOKIE, STATE_COOKIE, RETURN_COOKIE]) {
    response.cookies.set(name, '', { path: '/', maxAge: 0 });
  }

  return response;
}
