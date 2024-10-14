// Home page. Renders as a static page at build time; recent-articles strip
// gets wired to the Drupal client in the next commit.

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Home',
};

// ISR — rebuilt at most every 5 minutes in production. Overridden to 0 in
// preview mode via the article route handlers.
export const revalidate = 300;

export default function HomePage(): JSX.Element {
  return (
    <div className="space-y-12">
      <section>
        <h1 className="text-4xl font-bold tracking-tight">
          Drupal 11 + Next.js 15
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-[color:var(--color-muted)]">
          A starter for headless Drupal: JSON:API and GraphQL on the backend,
          Server Components, ISR, and editor preview on the frontend.
        </p>
        <div className="mt-6 flex gap-4">
          <a
            href="/articles"
            className="inline-flex items-center rounded-md bg-[color:var(--color-accent)] px-4 py-2 text-white no-underline"
          >
            Browse articles
          </a>
          <a
            href="https://www.drupal.org/project/jsonapi_extras"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-md border border-black/10 px-4 py-2"
          >
            JSON:API extras docs
          </a>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Recent articles</h2>
        <p className="mt-2 text-sm text-[color:var(--color-muted)]">
          Wired up to <code>getArticles()</code> in the next commit.
        </p>
      </section>
    </div>
  );
}
