import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getClientCredentialsToken,
  invalidateToken,
  OAuthError,
} from './token';

// A minimal Response stand-in for the two code paths token.ts exercises:
//   - res.json() on the success path
//   - res.text() on the error path
function mockResponse(
  body: unknown,
  { ok = true, status = 200, statusText = 'OK' } = {},
): Response {
  return {
    ok,
    status,
    statusText,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

function okToken(accessToken: string, expiresIn: number): Response {
  return mockResponse({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: expiresIn,
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.useFakeTimers();
  vi.setSystemTime(0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('getClientCredentialsToken', () => {
  it('reuses a cached token inside the 60s safety window', async () => {
    const clientId = 'reuse-client';
    fetchMock.mockResolvedValueOnce(okToken('tok-reuse', 3600));

    const first = await getClientCredentialsToken({ clientId });
    // Advance well within the token's life but only a few seconds — the cache
    // must serve the same token without a second network round-trip.
    vi.setSystemTime(5_000);
    const second = await getClientCredentialsToken({ clientId });

    expect(first).toBe('tok-reuse');
    expect(second).toBe('tok-reuse');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    invalidateToken(clientId);
  });

  it('refetches once the token enters its 60s expiry window', async () => {
    const clientId = 'expiry-client';
    // expires_in 100s -> expiresAt = 100_000ms. Safety window is 60s, so the
    // cached token stops being served once now >= 40_000ms.
    fetchMock
      .mockResolvedValueOnce(okToken('tok-old', 100))
      .mockResolvedValueOnce(okToken('tok-new', 100));

    const first = await getClientCredentialsToken({ clientId });
    expect(first).toBe('tok-old');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Cross into the safety window (41s > 100s - 60s).
    vi.setSystemTime(41_000);
    const second = await getClientCredentialsToken({ clientId });

    expect(second).toBe('tok-new');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    invalidateToken(clientId);
  });

  it('drops the cached token after invalidateToken', async () => {
    const clientId = 'invalidate-client';
    fetchMock
      .mockResolvedValueOnce(okToken('tok-1', 3600))
      .mockResolvedValueOnce(okToken('tok-2', 3600));

    const first = await getClientCredentialsToken({ clientId });
    expect(first).toBe('tok-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    invalidateToken(clientId);

    // Even though we're still inside the safety window, the cache is gone, so
    // the next call must mint a fresh token.
    const second = await getClientCredentialsToken({ clientId });
    expect(second).toBe('tok-2');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    invalidateToken(clientId);
  });

  it('throws OAuthError on a non-OK token response', async () => {
    const clientId = 'error-client';
    fetchMock.mockResolvedValue(
      mockResponse('invalid_client', {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      }),
    );

    const error = await getClientCredentialsToken({ clientId }).catch(
      (err: unknown) => err,
    );
    expect(error).toBeInstanceOf(OAuthError);
    expect((error as OAuthError).status).toBe(401);

    invalidateToken(clientId);
  });

  it('throws OAuthError when the body is missing access_token', async () => {
    const clientId = 'malformed-token-client';
    fetchMock.mockResolvedValue(
      mockResponse({ token_type: 'Bearer', expires_in: 3600 }),
    );

    await expect(
      getClientCredentialsToken({ clientId }),
    ).rejects.toBeInstanceOf(OAuthError);

    invalidateToken(clientId);
  });

  it('throws OAuthError when expires_in is not a number', async () => {
    const clientId = 'malformed-expiry-client';
    fetchMock.mockResolvedValue(
      mockResponse({ access_token: 'tok', expires_in: 'soon' }),
    );

    await expect(
      getClientCredentialsToken({ clientId }),
    ).rejects.toBeInstanceOf(OAuthError);

    invalidateToken(clientId);
  });

  it('does not cache a token after a failed request', async () => {
    const clientId = 'no-cache-on-fail-client';
    fetchMock
      .mockResolvedValueOnce(
        mockResponse('boom', {
          ok: false,
          status: 500,
          statusText: 'Server Error',
        }),
      )
      .mockResolvedValueOnce(okToken('tok-recovered', 3600));

    await expect(
      getClientCredentialsToken({ clientId }),
    ).rejects.toBeInstanceOf(OAuthError);

    // A subsequent call retries the network rather than serving a poisoned
    // cache entry.
    const recovered = await getClientCredentialsToken({ clientId });
    expect(recovered).toBe('tok-recovered');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    invalidateToken(clientId);
  });
});
