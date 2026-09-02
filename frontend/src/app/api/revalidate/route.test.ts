import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NextRequest } from 'next/server';

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

import { revalidateTag } from 'next/cache';

import { POST } from './route';

// Matches frontend/vitest.config.ts `test.env`.
const SECRET = 'test-revalidate';

function post(
  url: string,
  init?: { headers?: HeadersInit; body?: string },
): NextRequest {
  // NextRequest declares its own RequestInit; borrow it so
  // `exactOptionalPropertyTypes` lines up with the constructor signature.
  type NextRequestInit = NonNullable<ConstructorParameters<typeof NextRequest>[1]>;
  const requestInit: NextRequestInit = { method: 'POST' };
  if (init?.headers !== undefined) requestInit.headers = init.headers;
  if (init?.body !== undefined) requestInit.body = init.body;
  return new NextRequest(url, requestInit);
}

describe('POST /api/revalidate', () => {
  beforeEach(() => {
    vi.mocked(revalidateTag).mockClear();
  });

  it('rejects an invalid secret with 401 and does not call revalidateTag', async () => {
    const res = await POST(
      post('http://localhost/api/revalidate?secret=wrong&tag=articles:list'),
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Invalid revalidate secret.' });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('rejects a missing secret with 401', async () => {
    const res = await POST(
      post('http://localhost/api/revalidate?tag=articles:list'),
    );

    expect(res.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('returns 400 when the secret is valid but no tag is given', async () => {
    const res = await POST(
      post(`http://localhost/api/revalidate?secret=${SECRET}`),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing tag.' });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('calls revalidateTag and returns 200 with the tag from the query string', async () => {
    const res = await POST(
      post(
        `http://localhost/api/revalidate?secret=${SECRET}&tag=articles:list`,
      ),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revalidated: ['articles:list'] });
    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledWith('articles:list');
  });

  it('revalidates tags[] from a JSON body', async () => {
    const res = await POST(
      post('http://localhost/api/revalidate', {
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          secret: SECRET,
          tags: ['articles:list', 'articles:id:abc'],
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      revalidated: ['articles:list', 'articles:id:abc'],
    });
    expect(revalidateTag).toHaveBeenCalledTimes(2);
    expect(revalidateTag).toHaveBeenNthCalledWith(1, 'articles:list');
    expect(revalidateTag).toHaveBeenNthCalledWith(2, 'articles:id:abc');
  });
});
