// Article listing. Wired to the Drupal client in the next commit.

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Articles',
};

export const revalidate = 60;

export default function ArticleListPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Articles</h1>
      <p className="text-[color:var(--color-muted)]">
        List of recent articles will land here once <code>getArticles()</code> is in place.
      </p>
    </div>
  );
}
