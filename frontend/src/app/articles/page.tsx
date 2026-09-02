// Article listing page.
//
// The header renders immediately and the list streams in behind a <Suspense>
// boundary, so a slow Drupal response delays the grid rather than the whole
// document. ISR keeps a 60s revalidate window on top of that — content edits
// show up within a minute without a redeploy.

import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ArticleCard } from '@/components/ArticleCard';
import { ArticleListSkeleton } from '@/components/ArticleCardSkeleton';
import { getArticles } from '@/lib/drupal/queries';

export const metadata: Metadata = {
  title: 'Articles',
  description: 'Articles published from the Drupal backend.',
};

export const revalidate = 60;

/**
 * The awaiting half of the page. Kept as its own async component so everything
 * around it can flush to the browser before Drupal has answered.
 */
async function ArticleList() {
  const articles = await getArticles({ limit: 24 });

  if (articles.length === 0) {
    return (
      <p className="text-[color:var(--color-muted)]">
        Nothing here yet. Create an article in Drupal and it will appear on the
        next ISR rebuild.
      </p>
    );
  }

  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <li key={article.id}>
          <ArticleCard article={article} />
        </li>
      ))}
    </ul>
  );
}

export default function ArticleListPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Articles</h1>
        <p className="text-[color:var(--color-muted)]">
          Published from Drupal via JSON:API.
        </p>
      </header>

      <Suspense fallback={<ArticleListSkeleton />}>
        <ArticleList />
      </Suspense>
    </div>
  );
}
