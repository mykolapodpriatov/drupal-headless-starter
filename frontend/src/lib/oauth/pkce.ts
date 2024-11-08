// PKCE helpers. Used by the editor preview flow, where the browser starts an
// OAuth2 Authorization Code + PKCE handshake against Drupal.
//
// Verifier is stored in a short-lived, HttpOnly cookie set on the outbound
// /oauth/authorize redirect; the callback route reads it back when exchanging
// the auth code for a token.

import 'server-only';

import { createHash, randomBytes } from 'node:crypto';

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function generatePkceVerifier(): string {
  // 32 random bytes -> 43-char base64url, well within the 43-128 RFC range.
  return base64UrlEncode(randomBytes(32));
}

export function deriveChallenge(verifier: string): string {
  return base64UrlEncode(createHash('sha256').update(verifier).digest());
}

export function generateState(): string {
  return base64UrlEncode(randomBytes(16));
}

export interface PkcePair {
  verifier: string;
  challenge: string;
  challengeMethod: 'S256';
  state: string;
}

export function createPkcePair(): PkcePair {
  const verifier = generatePkceVerifier();
  return {
    verifier,
    challenge: deriveChallenge(verifier),
    challengeMethod: 'S256',
    state: generateState(),
  };
}
