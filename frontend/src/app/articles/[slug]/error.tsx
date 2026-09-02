'use client';

import { useEffect } from 'react';

import { ErrorState } from '@/components/ErrorState';

export default function ArticleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[article-error]', error);
  }, [error]);

  return (
    <ErrorState
      title="This article could not be loaded"
      description="The backend answered, but not in a shape this page can render. Retrying often clears it."
      error={error}
      reset={reset}
    />
  );
}
