// High-level Drupal queries. Pages should reach for these — never raw
// drupalFetch — so the JSON:API field list lives in one place per resource.

import 'server-only';

import { z } from 'zod';

import { drupalFetch } from '@/lib/drupal/client';
import { mapArticle, mapArticles } from '@/lib/drupal/mappers/article';
import {
  type Article,
  articleSchema,
  fileResourceSchema,
  jsonApiCollectionSchema,
  jsonApiSingleSchema,
} from '@/lib/drupal/types';

/** Field sets — keep narrow so jsonapi_extras can optimise. */
const ARTICLE_FIELDS = [
  'title',
  'published',
  'slug',
  'createdAt',
  'updatedAt',
  'body',
  'image',
] as const;

const FILE_FIELDS = ['uri', 'filemime', 'filesize'] as const;

const articleCollectionResponse = jsonApiCollectionSchema(articleSchema).extend({
  included: z.array(fileResourceSchema).optional(),
});

const articleSingleResponse = jsonApiSingleSchema(articleSchema).extend({
  included: z.array(fileResourceSchema).optional(),
});

/** ----------------------------------------------------------------------
 * Public queries
 * ----------------------------------------------------------------------- */

export interface GetArticlesOptions {
  limit?: number;
  offset?: number;
  /** When true, includes drafts (requires the editor consumer + auth). */
  draft?: boolean;
}

/**
 * Whether an error means the Drupal backend could not be reached at all.
 *
 * `fetch()` throws a `TypeError` ("fetch failed", e.g. ECONNREFUSED) when the
 * host is unreachable — which is normal when the frontend is built without a
 * live backend (CI, a standalone `next build`). API and schema errors are
 * `DrupalApiError` / `DrupalValidationError` and must still surface, so this
 * only matches transport-level failures.
 */
function isBackendUnreachable(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    (error instanceof Error && error.message.includes('fetch failed'))
  );
}

export async function getArticles(
  opts: GetArticlesOptions = {},
): Promise<Article[]> {
  const limit = opts.limit ?? 12;
  const offset = opts.offset ?? 0;

  try {
    const response = await drupalFetch({
      resource: 'articles',
      schema: articleCollectionResponse,
      draft: opts.draft ?? false,
      next: opts.draft
        ? { revalidate: 0 }
        : { revalidate: 60, tags: ['articles:list'] },
      query: {
        include: ['image'],
        fields: {
          'node--article': [...ARTICLE_FIELDS],
          'file--file': [...FILE_FIELDS],
        },
        sort: ['-createdAt'],
        page: { limit, offset },
        filter: opts.draft ? {} : { 'published': true },
      },
    });

    return mapArticles(response.data, response.included);
  } catch (error) {
    if (isBackendUnreachable(error)) {
      console.warn(
        '[drupal] Backend unreachable while listing articles; returning [] (ISR will refill).',
      );
      return [];
    }
    throw error;
  }
}

export async function getArticleBySlug(
  slug: string,
  opts: { draft?: boolean } = {},
): Promise<Article | null> {
  // `slug` is the bare alias segment from the route (e.g. "my-post"); the
  // node's stored path alias is "/articles/<slug>". JSON:API can filter on the
  // computed path alias directly via `path.alias`, which is more reliable than
  // filtering the renamed `slug` attribute (an alias of `path.alias` produced
  // by a jsonapi_extras enhancer). Articles need an alias for this lookup to
  // resolve — e.g. a pathauto pattern of `articles/[node:title]`.
  const aliasPath = `/articles/${slug.replace(/^\/+/, '')}`;

  const response = await drupalFetch({
    resource: 'articles',
    schema: articleCollectionResponse,
    draft: opts.draft ?? false,
    next: opts.draft
      ? { revalidate: 0 }
      : { revalidate: 60, tags: [`articles:slug:${aliasPath}`] },
    query: {
      include: ['image'],
      fields: {
        'node--article': [...ARTICLE_FIELDS],
        'file--file': [...FILE_FIELDS],
      },
      filter: { 'path.alias': aliasPath },
      page: { limit: 1 },
    },
  });

  const node = response.data[0];
  if (!node) return null;
  return mapArticle(node, response.included);
}

export async function getArticleById(
  uuid: string,
  opts: { draft?: boolean } = {},
): Promise<Article | null> {
  const response = await drupalFetch({
    resource: `articles/${uuid}`,
    schema: articleSingleResponse,
    draft: opts.draft ?? false,
    next: opts.draft
      ? { revalidate: 0 }
      : { revalidate: 60, tags: [`articles:id:${uuid}`] },
    query: {
      include: ['image'],
      fields: {
        'node--article': [...ARTICLE_FIELDS],
        'file--file': [...FILE_FIELDS],
      },
    },
  });

  return mapArticle(response.data, response.included);
}

/** Return just `id` + `slug` — used by generateStaticParams. */
export async function getArticleSlugs(): Promise<Array<{ slug: string }>> {
  try {
    const response = await drupalFetch({
      resource: 'articles',
      schema: articleCollectionResponse,
      next: { revalidate: 300, tags: ['articles:slugs'] },
      query: {
        fields: { 'node--article': ['slug', 'published'] },
        sort: ['-createdAt'],
        page: { limit: 100 },
        filter: { 'published': true },
      },
    });

    return response.data
      .map((r) => r.attributes.slug)
      .filter((s): s is string => Boolean(s))
      .map((s) => ({ slug: s.replace(/^\/articles\//, '') }));
  } catch (error) {
    if (isBackendUnreachable(error)) {
      // No live backend at build time: pre-render nothing and let
      // dynamicParams + ISR generate each article page on first request.
      console.warn(
        '[drupal] Backend unreachable while collecting slugs; skipping static pre-render.',
      );
      return [];
    }
    throw error;
  }
}
