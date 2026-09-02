'use client';

import { useEffect } from 'react';

import { ErrorState } from '@/components/ErrorState';

/**
 * Route-level boundary. Catches anything thrown while rendering a page under
 * the root layout — most often a Drupal response that failed schema validation
 * or a non-2xx the query layer deliberately did not swallow.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-side this already reached the platform log; this covers the
    // client-navigation case. TODO: forward to Sentry/OTel in a real project.
    console.error('[route-error]', error);
  }, [error]);

  return <ErrorState error={error} reset={reset} />;
}
