// JSON:API → domain model.
//
// This is the seam that keeps Drupal's transport shape out of React. Nothing
// above this layer should ever see `attributes`, `relationships` or `included`
// — components take the `Article` domain model and nothing else. Renaming a
// field on the Drupal side therefore changes exactly one file.
//
// Deliberately NOT marked `server-only`: mappers are pure functions and get
// exercised from unit tests and Storybook, neither of which runs on the server.
// See docs/decisions/001-domain-model-mapping.md.

import type {
  Article,
  ArticleResource,
  FileResource,
  MediaImage,
} from '@/lib/drupal/types';

const PUBLIC_DRUPAL_URL = process.env.NEXT_PUBLIC_DRUPAL_BASE_URL ?? '';

/**
 * Canonicalise a Drupal file URL against the public origin.
 *
 * Both transports (JSON:API's `uri.url`, GraphQL Compose's `image.url`) can
 * hand back a site-relative path; `next/image` needs an absolute one to load
 * it from the browser. Shared here so the two mappers agree on the rule
 * rather than reimplementing it.
 */
export function canonicalizeFileUrl(url: string): string {
  return url.startsWith('http')
    ? url
    : new URL(url, PUBLIC_DRUPAL_URL || 'http://localhost').toString();
}

/**
 * Resolve the article's image from the JSON:API `included` side-load.
 *
 * JSON:API delivers relationships as `{ data: { id, type } }` pointers and puts
 * the actual file resource in a sibling `included` array, so resolution is a
 * lookup by id. Returns null whenever the relationship is absent or the file
 * was not side-loaded (i.e. the caller forgot `?include=image`).
 */
export function resolveArticleImage(
  resource: ArticleResource,
  included: FileResource[] | undefined,
): MediaImage | null {
  const ref = resource.relationships?.image?.data;
  if (!ref || !included) return null;

  const file = included.find((f) => f.id === ref.id);
  if (!file) return null;

  return {
    url: canonicalizeFileUrl(file.attributes.uri.url),
    alt: '', // alt lives in the field's relationship meta — fetched separately
    // in a richer client; this starter keeps it simple.
    width: null,
    height: null,
  };
}

/**
 * Flatten one article resource (plus its side-loaded files) into the domain
 * model the UI consumes.
 *
 * `slug` falls back to the canonical `/node/<uuid>` path when the node has no
 * path alias, so routing never receives an empty string.
 */
export function mapArticle(
  resource: ArticleResource,
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
    image: resolveArticleImage(resource, included),
  };
}

/** Map a JSON:API collection payload in one call. */
export function mapArticles(
  resources: ArticleResource[],
  included: FileResource[] | undefined,
): Article[] {
  return resources.map((r) => mapArticle(r, included));
}
