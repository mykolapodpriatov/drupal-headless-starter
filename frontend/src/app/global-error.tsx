'use client';

import { useEffect } from 'react';

import { ErrorState } from '@/components/ErrorState';

/**
 * Last-resort boundary: a throw in the root layout itself, where `error.tsx`
 * cannot help because the layout that would host it is the thing that failed.
 * It must therefore render its own <html>/<body> — and cannot rely on the app's
 * fonts, providers or global styles being mounted.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global-error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{ fontFamily: 'system-ui, sans-serif', padding: '4rem 1rem' }}
      >
        <ErrorState
          title="The application failed to start"
          description="A problem in the root layout stopped the page from rendering."
          error={error}
          reset={reset}
        />
      </body>
    </html>
  );
}
