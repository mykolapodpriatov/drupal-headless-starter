// High-level Drupal queries. Pages should reach for these — never raw
// drupalFetch — so the JSON:API field list lives in one place per resource.

import 'server-only';

import { z } from 'zod';

import { drupalFetch } from '@/lib/drupal/client';
import {
  type Article,
  type FileResource,
  type MediaImage,
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

const PUBLIC_DRUPAL_URL = process.env.NEXT_PUBLIC_DRUPAL_BASE_URL ?? '';

const articleCollectionResponse = jsonApiCollectionSchema(articleSchema).extend({
  included: z.array(fileResourceSchema).optional(),
});

const articleSingleResponse = jsonApiSingleSchema(articleSchema).extend({
  included: z.array(fileResourceSchema).optional(),
});

/** ----------------------------------------------------------------------
 * Internal helpers
 * ----------------------------------------------------------------------- */

function resolveImageFromIncluded(
  resource: z.infer<typeof articleSchema>,
  included: FileResource[] | undefined,
): MediaImage | null {
  const ref = resource.relationships?.image?.data;
  if (!ref || !included) return null;
  const file = included.find((f) => f.id === ref.id);
  if (!file) return null;

  // jsonapi_extras gives us a relative URL; canonicalize against the public
  // Drupal base URL so next/image can load it.
  const url = file.attributes.uri.url.startsWith('http')
    ? file.attributes.uri.url
    : new URL(file.attributes.uri.url, PUBLIC_DRUPAL_URL || 'http://localhost').toString();

  return {
    url,
    alt: '', // alt comes from the field meta — fetched separately in a richer
             // client; this starter keeps it simple.
    width: null,
    height: null,
  };
}

function flattenArticle(
  resource: z.infer<typeof articleSchema>,
  included: FileResource[] | undefined,
): Article {
  return {
    id: resource.id,
    title: resource.attributes.title,
    slug: resource.attributes.slug ?? `/node/${resource.id}`,
    createdAt: resource.attributes.createdAt,
    updatedAt: resource.attributes.updatedAt,
    published: resource.attributes.published,
    body: resource.attributes.body,
    image: resolveImageFromIncluded(resource, included),
  };
}

/** ----------------------------------------------------------------------
 * Public queries
 * ----------------------------------------------------------------------- */

export interface GetArticlesOptions {
  limit?: number;
  offset?: number;
  /** When true, includes drafts (requires the editor consumer + auth). */
  draft?: boolean;
}

export async function getArticles(
  opts: GetArticlesOptions = {},
): Promise<Article[]> {
  const limit = opts.limit ?? 12;
  const offset = opts.offset ?? 0;

  const response = await drupalFetch({
    resource: 'articles',
    schema: articleCollectionResponse,
    draft: opts.draft,
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

  return response.data.map((r) => flattenArticle(r, response.included));
}

export async function getArticleBySlug(
  slug: string,
  opts: { draft?: boolean } = {},
): Promise<Article | null> {
  // Drupal returns the path alias with a leading slash; normalise for the
  // filter.
  const normalised = slug.startsWith('/') ? slug : `/${slug}`;

  const response = await drupalFetch({
    resource: 'articles',
    schema: articleCollectionResponse,
    draft: opts.draft,
    next: opts.draft
      ? { revalidate: 0 }
      : { revalidate: 60, tags: [`articles:slug:${normalised}`] },
    query: {
      include: ['image'],
      fields: {
        'node--article': [...ARTICLE_FIELDS],
        'file--file': [...FILE_FIELDS],
      },
      filter: { 'slug': normalised },
      page: { limit: 1 },
    },
  });

  const node = response.data[0];
  if (!node) return null;
  return flattenArticle(node, response.included);
}

export async function getArticleById(
  uuid: string,
  opts: { draft?: boolean } = {},
): Promise<Article | null> {
  const response = await drupalFetch({
    resource: `articles/${uuid}`,
    schema: articleSingleResponse,
    draft: opts.draft,
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

  return flattenArticle(response.data, response.included);
}

/** Return just `id` + `slug` — used by generateStaticParams. */
export async function getArticleSlugs(): Promise<Array<{ slug: string }>> {
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
}
