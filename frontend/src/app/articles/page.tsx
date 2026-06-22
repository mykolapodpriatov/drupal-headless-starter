// Article listing page. ISR with a 60s revalidate window — content edits
// in Drupal show up within a minute.

import type { Metadata } from 'next';

import { ArticleCard } from '@/components/ArticleCard';
import { getArticles } from '@/lib/drupal/queries';

export const metadata: Metadata = {
  title: 'Articles',
  description: 'Articles published from the Drupal backend.',
};

export const revalidate = 60;

export default async function ArticleListPage() {
  const articles = await getArticles({ limit: 24 });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Articles</h1>
        <p className="text-[color:var(--color-muted)]">
          {articles.length} article{articles.length === 1 ? '' : 's'} published.
        </p>
      </header>

      {articles.length === 0 ? (
        <p className="text-[color:var(--color-muted)]">
          Nothing here yet. Create an article in Drupal and it will appear on
          the next ISR rebuild.
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
    </div>
  );
}
