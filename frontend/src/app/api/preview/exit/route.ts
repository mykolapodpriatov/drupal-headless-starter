// Drop out of preview mode. Editors hit this from the "Exit preview" banner;
// it just disables draftMode() and bounces back to the home page (or a
// caller-supplied path).

import { draftMode } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  (await draftMode()).disable();
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('redirect') ?? '/';
  // Only allow internal redirects.
  const safe =
    target.startsWith('/') && !target.startsWith('//') ? target : '/';
  return NextResponse.redirect(new URL(safe, req.url));
}
