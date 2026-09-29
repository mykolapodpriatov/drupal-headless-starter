// Article listing page.
//
// ISR keeps a 60s revalidate window on top of the fetch, so content edits
// show up within a minute without a redeploy.
//
// Deliberately NOT streamed behind a <Suspense> boundary, unlike most other
// content on this site. React's out-of-order streaming shows the fallback in
// the initial HTML and later patches the real content into place via inline
// scripts, which needs JavaScript to run at all. The "Load more" control here
// has to work with JavaScript disabled (see LoadMoreLink), and a control
// stuck permanently behind a loading skeleton does not satisfy that: this
// page awaits its data before responding, the same way /articles/[slug]
// already avoids a segment-level `loading.tsx` for a related reason (ADR
// 002). The cost is the same either way: a slow Drupal response delays the
// whole response rather than just the grid.
//
// Pagination is `?page=` driven and cursor-based: see getArticlesListPage()
// in lib/drupal/queries.ts for why (JSON:API links.next, not page[offset]),
// and LoadMoreLink for why the control is a real anchor rather than a
// client-only button.

import type { Metadata } from 'next';
import Link from 'next/link';

import { ArticleCard } from '@/components/ArticleCard';
import { LoadMoreLink } from '@/components/LoadMoreLink';
import { getArticlesListPage } from '@/lib/drupal/queries';

export const metadata: Metadata = {
  title: 'Articles',
  description: 'Articles published from the Drupal backend.',
};

export const revalidate = 60;

interface ArticleListPageProps {
  searchParams: Promise<{ page?: string }>;
}

function parsePage(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function ArticleListPage({
  searchParams,
}: ArticleListPageProps) {
  const { page: rawPage } = await searchParams;
  const page = parsePage(rawPage);

  const { articles, hasNextPage } = await getArticlesListPage({ page });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Articles</h1>
        <p className="text-[color:var(--color-muted)]">
          Published from Drupal via JSON:API. Prefer GraphQL?{' '}
          <Link href="/articles/graphql" className="underline">
            See the same listing via GraphQL Compose
          </Link>
          .
        </p>
      </header>

      {articles.length === 0 ? (
        <p className="text-[color:var(--color-muted)]">
          Nothing here yet. Create an article in Drupal and it will appear on
          the next ISR rebuild.
        </p>
      ) : (
        <>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <li key={article.id}>
                <ArticleCard article={article} />
              </li>
            ))}
          </ul>

          {hasNextPage ? <LoadMoreLink nextPage={page + 1} /> : null}
        </>
      )}
    </div>
  );
}
