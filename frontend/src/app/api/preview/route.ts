// Preview mode handshake. Drupal's "View on frontend" link hits this route
// with a shared secret and a slug; we validate the secret, flip Next.js into
// draft mode, and redirect to the article. RSC reading draftMode().isEnabled
// will then fetch the working-copy revision.
//
// See docs/preview-mode.md for the end-to-end sequence.

import { timingSafeEqual } from 'node:crypto';

import { draftMode } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function safeEqual(a: string, b: string): boolean {
  // timingSafeEqual requires equal-length buffers, so we pad the shorter side.
  const enc = new TextEncoder();
  const aBuf = enc.encode(a);
  const bBuf = enc.encode(b);
  if (aBuf.length !== bBuf.length) {
    // Still compare in constant time relative to `a` to avoid early-exit
    // length leaks.
    const padded = new Uint8Array(aBuf.length);
    padded.set(bBuf.subarray(0, Math.min(bBuf.length, aBuf.length)));
    timingSafeEqual(aBuf, padded);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

function isSafeInternalPath(path: string): boolean {
  // Only allow same-site, root-relative paths. Reject anything that could
  // become an open redirect or smuggle headers via CR/LF.
  if (!path.startsWith('/')) return false;
  if (path.startsWith('//')) return false;
  if (/[\r\n]/.test(path)) return false;
  return true;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const expected = process.env.DRUPAL_PREVIEW_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: 'Preview is not configured on this environment.' },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(req.url);
  const provided = searchParams.get('secret');
  const slug = searchParams.get('slug');

  if (!provided || !safeEqual(provided, expected)) {
    return NextResponse.json({ error: 'Invalid preview secret.' }, { status: 401 });
  }

  if (!slug || !isSafeInternalPath(slug)) {
    return NextResponse.json(
      { error: 'Missing or unsafe slug parameter.' },
      { status: 400 },
    );
  }

  // Flip the draft-mode cookies. NextResponse.redirect picks them up
  // automatically from the request headers Next adds during draftMode().enable().
  (await draftMode()).enable();

  return NextResponse.redirect(new URL(slug, req.url));
}
