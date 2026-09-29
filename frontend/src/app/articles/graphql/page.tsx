// GraphQL Compose version of the article listing.
//
// Same page, same ArticleCard, same domain model as /articles. The only
// difference is the query in lib/drupal/queries.ts: getArticlesGraphQL()
// asks graphql_compose for exactly the fields this grid needs (including the
// image, with no `?include=` side-load) instead of building a JSON:API
// filter/fields/include query string. Kept as its own route rather than a
// toggle so the two are directly comparable in the network tab.
//
// Not streamed behind <Suspense>, for the same reason as /articles: a reader
// comparing the two should get a consistent, fully-rendered response from
// either one, JavaScript or not.
//
// See docs/architecture.md#why-both-jsonapi-and-graphql and ADR 001. The
// mapper contract is identical, so nothing here can tell which transport
// produced the data.

import type { Metadata } from 'next';
import Link from 'next/link';

import { ArticleCard } from '@/components/ArticleCard';
import { getArticlesGraphQL } from '@/lib/drupal/queries';

export const metadata: Metadata = {
  title: 'Articles (GraphQL)',
  description:
    'The same article listing as /articles, fetched through GraphQL Compose instead of JSON:API.',
};

export const revalidate = 60;

export default async function ArticleListGraphQLPage() {
  const articles = await getArticlesGraphQL({ limit: 24 });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Articles</h1>
        <p className="text-[color:var(--color-muted)]">
          Fetched via GraphQL Compose instead of JSON:API.{' '}
          <Link href="/articles" className="underline">
            See the JSON:API version
          </Link>{' '}
          for comparison.
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
