'use client';

interface ErrorStateProps {
  title?: string;
  description?: string;
  /** The error Next handed to the boundary. Only its digest is ever shown. */
  error?: Error & { digest?: string };
  /** Re-runs the failed render. Omit for boundaries that cannot retry. */
  reset?: () => void;
}

/**
 * What a user sees when a render throws.
 *
 * Two rules drive the shape:
 *
 *  - `role="alert"` so the failure is announced, not just coloured red;
 *  - never print `error.message`. A Drupal error can carry the backend URL, the
 *    query string or part of the payload, none of which belongs in a browser.
 *    The `digest` Next generates is enough to find the real stack trace in the
 *    server log, so support still has a thread to pull.
 */
export function ErrorState({
  title = 'Something went wrong',
  description = 'The page could not be loaded. This is usually temporary.',
  error,
  reset,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="mx-auto max-w-lg space-y-4 rounded border border-red-300 bg-red-50 px-6 py-8 text-center"
    >
      <h2 className="text-xl font-semibold text-red-900">{title}</h2>
      <p className="text-red-900/80">{description}</p>

      {reset ? (
        <button
          type="button"
          onClick={reset}
          className="rounded bg-red-700 px-4 py-2 font-medium text-white"
        >
          Try again
        </button>
      ) : null}

      {error?.digest ? (
        <p className="text-xs text-red-900/60">
          Reference: <code>{error.digest}</code>
        </p>
      ) : null}
    </div>
  );
}
