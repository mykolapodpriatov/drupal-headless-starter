import { describe, expect, it } from 'vitest';

import {
  createPkcePair,
  deriveChallenge,
  generatePkceVerifier,
} from './pkce';

const BASE64URL = /^[A-Za-z0-9_-]+$/;

describe('generatePkceVerifier', () => {
  it('produces a 43-char base64url string within the RFC 7636 43-128 range', () => {
    const verifier = generatePkceVerifier();
    expect(verifier).toMatch(BASE64URL);
    expect(verifier).toHaveLength(43);
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
  });

  it('is unpredictable across calls', () => {
    expect(generatePkceVerifier()).not.toBe(generatePkceVerifier());
  });
});

describe('deriveChallenge', () => {
  it('is deterministic for a given verifier', () => {
    const verifier = generatePkceVerifier();
    expect(deriveChallenge(verifier)).toBe(deriveChallenge(verifier));
  });

  it('matches the RFC 7636 Appendix B SHA-256 test vector', () => {
    // From RFC 7636 Appendix B.
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const expected = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
    expect(deriveChallenge(verifier)).toBe(expected);
  });

  it('emits base64url with no padding', () => {
    const challenge = deriveChallenge(generatePkceVerifier());
    expect(challenge).toMatch(BASE64URL);
    expect(challenge).not.toContain('=');
  });
});

describe('createPkcePair', () => {
  it('returns a challenge derived from the verifier via S256', () => {
    const pair = createPkcePair();
    expect(pair.challengeMethod).toBe('S256');
    expect(pair.challenge).toBe(deriveChallenge(pair.verifier));
    expect(pair.verifier).toHaveLength(43);
    expect(pair.state).toMatch(BASE64URL);
  });
});
