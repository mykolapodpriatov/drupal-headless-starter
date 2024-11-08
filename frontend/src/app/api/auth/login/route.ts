// Kick off an OAuth2 Authorization Code + PKCE flow against Drupal.
//
// Stores the PKCE verifier and state in HttpOnly cookies (5 minute TTL —
// matches simple_oauth's authorization_code_expiration), then 302s to
// Drupal's /oauth/authorize endpoint.

import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

import { createPkcePair } from '@/lib/oauth/pkce';

export const dynamic = 'force-dynamic';

const PKCE_COOKIE = 'oauth_pkce_verifier';
const STATE_COOKIE = 'oauth_state';
const RETURN_COOKIE = 'oauth_return_to';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const drupalUrl = process.env.NEXT_PUBLIC_DRUPAL_BASE_URL;
  const clientId = process.env.DRUPAL_CLIENT_ID;
  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL ?? new URL(req.url).origin;

  if (!drupalUrl || !clientId) {
    return NextResponse.json(
      { error: 'OAuth not configured on this environment.' },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(req.url);
  const returnTo = searchParams.get('return_to') ?? '/';
  const safeReturn = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';

  const pair = createPkcePair();

  const authorizeUrl = new URL('/oauth/authorize', drupalUrl);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', `${frontendUrl}/api/auth/callback`);
  authorizeUrl.searchParams.set('scope', 'editor');
  authorizeUrl.searchParams.set('state', pair.state);
  authorizeUrl.searchParams.set('code_challenge', pair.challenge);
  authorizeUrl.searchParams.set('code_challenge_method', pair.challengeMethod);

  const response = NextResponse.redirect(authorizeUrl);

  const cookieStore = await cookies();
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 5 * 60,
  };
  cookieStore.set(PKCE_COOKIE, pair.verifier, cookieOpts);
  cookieStore.set(STATE_COOKIE, pair.state, cookieOpts);
  cookieStore.set(RETURN_COOKIE, safeReturn, cookieOpts);

  return response;
}

export const COOKIE_NAMES = { PKCE_COOKIE, STATE_COOKIE, RETURN_COOKIE };
