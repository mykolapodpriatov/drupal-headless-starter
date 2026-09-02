// On-demand ISR invalidation webhook.
//
// Drupal (or a deploy hook) POSTs a shared secret plus one or more cache
// tags. After the secret checks out we call revalidateTag() for each tag so
// the next request refetches instead of waiting out the 60s ISR window.
//
// Accepts `secret` + `tag` / `tags[]` from the query string or the JSON/form
// body — whichever the caller finds easier.

import { timingSafeEqual } from 'node:crypto';

import { revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function safeEqual(a: string, b: string): boolean {
  // timingSafeEqual requires equal-length buffers, so we pad the shorter side.
  const enc = new TextEncoder();
  const aBuf = enc.encode(a);
  const bBuf = enc.encode(b);
  if (aBuf.length !== bBuf.length) {
    const padded = new Uint8Array(aBuf.length);
    padded.set(bBuf.subarray(0, Math.min(bBuf.length, aBuf.length)));
    timingSafeEqual(aBuf, padded);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

function asStrings(value: unknown): string[] {
  if (typeof value === 'string' && value.length > 0) return [value];
  if (Array.isArray(value)) {
    return value.filter(
      (v): v is string => typeof v === 'string' && v.length > 0,
    );
  }
  return [];
}

function uniqueTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

function tagsFromSearchParams(params: URLSearchParams): string[] {
  return [
    ...params.getAll('tag'),
    ...params.getAll('tags'),
    ...params.getAll('tags[]'),
  ];
}

async function readBody(
  req: NextRequest,
): Promise<{ secret?: string; tags: string[] }> {
  const contentType = req.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) {
      const body = (await req.json()) as Record<string, unknown>;
      const secret = typeof body.secret === 'string' ? body.secret : undefined;
      return {
        ...(secret !== undefined ? { secret } : {}),
        tags: [
          ...asStrings(body.tag),
          ...asStrings(body.tags),
          ...asStrings(body['tags[]']),
        ],
      };
    }
    if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const form = await req.formData();
      const secretVal = form.get('secret');
      const secret = typeof secretVal === 'string' ? secretVal : undefined;
      return {
        ...(secret !== undefined ? { secret } : {}),
        tags: [
          ...form.getAll('tag'),
          ...form.getAll('tags'),
          ...form.getAll('tags[]'),
        ].filter((v): v is string => typeof v === 'string' && v.length > 0),
      };
    }
  } catch {
    // Unparseable body — treat as empty so a bad payload cannot 500 the route.
  }
  return { tags: [] };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const expected = process.env.DRUPAL_REVALIDATE_SECRET;
  const { searchParams } = new URL(req.url);
  const body = await readBody(req);

  const provided = searchParams.get('secret') ?? body.secret ?? '';

  if (!expected || !provided || !safeEqual(provided, expected)) {
    return NextResponse.json(
      { error: 'Invalid revalidate secret.' },
      { status: 401 },
    );
  }

  const tags = uniqueTags([
    ...tagsFromSearchParams(searchParams),
    ...body.tags,
  ]);
  if (tags.length === 0) {
    return NextResponse.json({ error: 'Missing tag.' }, { status: 400 });
  }

  for (const tag of tags) {
    revalidateTag(tag);
  }

  return NextResponse.json({ revalidated: tags }, { status: 200 });
}
