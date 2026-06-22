// Home page. Renders as a static page at build time with ISR — recent
// articles strip refreshes every 5 minutes in production.

import type { Metadata } from 'next';
import Link from 'next/link';

import { ArticleCard } from '@/components/ArticleCard';
import { getArticles } from '@/lib/drupal/queries';

export const metadata: Metadata = {
  title: 'Home',
};

export const revalidate = 300;

export default async function HomePage() {
  const articles = await getArticles({ limit: 6 });

  return (
    <div className="space-y-16">
      <section>
        <h1 className="text-4xl font-bold tracking-tight">
          Drupal 11 + Next.js 15
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-[color:var(--color-muted)]">
          A starter for headless Drupal: a JSON:API backend (with GraphQL
          Compose available), Server Components, ISR, and editor preview on the
          frontend.
        </p>
        <div className="mt-6 flex gap-4">
          <Link
            href="/articles"
            className="inline-flex items-center rounded-md bg-[color:var(--color-accent)] px-4 py-2 text-white no-underline"
          >
            Browse articles
          </Link>
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

      <section className="space-y-6">
        <h2 className="text-xl font-semibold">Recent articles</h2>
        {articles.length === 0 ? (
          <p className="text-[color:var(--color-muted)]">
            No articles yet. Create one in Drupal admin to see it here.
          </p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <li key={article.id}>
                <ArticleCard article={article} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
