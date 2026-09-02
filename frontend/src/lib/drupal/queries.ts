// High-level Drupal queries. Pages should reach for these — never raw
// drupalFetch — so the JSON:API field list lives in one place per resource.

import 'server-only';

import { z } from 'zod';

import { drupalFetch, isOAuthError } from '@/lib/drupal/client';
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
 * Whether an error means there is no usable Drupal backend behind the
 * configured URL — as opposed to a backend that answered and said no.
 *
 * Two shapes count:
 *
 *   - `TypeError` ("fetch failed", e.g. ECONNREFUSED) — nothing is listening;
 *   - `OAuthError` — something answered, but the OAuth token endpoint is not
 *     there. That is what a `next build` against a placeholder URL looks like
 *     when the port happens to be occupied by an unrelated server, which is
 *     common on a dev machine (Docker, another framework) and would otherwise
 *     fail the build with a confusing 404.
 *
 * `DrupalApiError` and `DrupalValidationError` deliberately do NOT count: a
 * backend that replied with a bad status or a drifted schema is a real problem
 * and must surface rather than silently render an empty page.
 */
function isBackendUnavailable(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    isOAuthError(error) ||
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
    if (isBackendUnavailable(error)) {
      console.warn(
        '[drupal] Backend unavailable while listing articles; returning [] (ISR will refill).',
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
  // The node's stored path alias is "/articles/<slug>". Callers hand us either
  // the bare route segment ("my-post") or the full alias
  // ("/articles/my-post") — accept both and normalise once, because building
  // the prefix at the call site is how you end up querying
  // "/articles/articles/my-post" and 404ing every detail page.
  //
  // JSON:API filters on the computed `path.alias`, which is more reliable than
  // filtering the renamed `slug` attribute (an alias of `path.alias` produced
  // by a jsonapi_extras enhancer). Articles need an alias for this lookup to
  // resolve — e.g. a pathauto pattern of `articles/[node:title]`.
  const bare = slug.replace(/^\/+/, '').replace(/^articles\//, '');
  const aliasPath = `/articles/${bare}`;

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
    if (isBackendUnavailable(error)) {
      // No live backend at build time: pre-render nothing and let
      // dynamicParams + ISR generate each article page on first request.
      console.warn(
        '[drupal] Backend unavailable while collecting slugs; skipping static pre-render.',
      );
      return [];
    }
    throw error;
  }
}
