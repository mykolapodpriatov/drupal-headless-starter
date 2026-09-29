// GraphQL Compose → domain model.
//
// The GraphQL counterpart to mappers/article.ts. Same seam, same contract
// (ADR 001, "the mapper layer"): nothing above this function may see a
// GraphQL Compose field name (`status`, `path`, `created.time`, ...). It
// gets exactly the same `Article` domain model the JSON:API mapper produces,
// flattened the same way, canonicalised the same way. Whatever differs
// between the two transports stops here.
//
// Deliberately NOT marked `server-only`, for the same reason as the JSON:API
// mapper: it is a pure function, exercised from unit tests without a network.

import { canonicalizeFileUrl } from '@/lib/drupal/mappers/article';
import type { Article, GraphQLArticle } from '@/lib/drupal/types';

/**
 * Flatten one GraphQL Compose `NodeArticle` into the domain model the UI
 * consumes: the identical shape `mapArticle()` produces from JSON:API.
 *
 * `slug` falls back to the canonical `/node/<uuid>` path when the node has no
 * path alias, mirroring the JSON:API mapper's fallback so routing never
 * receives an empty string regardless of which transport fetched the node.
 */
export function mapGraphqlArticle(node: GraphQLArticle): Article {
  return {
    id: node.id,
    title: node.title,
    slug: node.path ?? `/node/${node.id}`,
    createdAt: node.created.time,
    updatedAt: node.changed.time,
    published: node.status,
    body: node.body,
    image: node.image
      ? {
          url: canonicalizeFileUrl(node.image.url),
          alt: node.image.alt ?? '',
          width: node.image.width,
          height: node.image.height,
        }
      : null,
  };
}

/** Map a GraphQL Compose connection's `nodes` array in one call. */
export function mapGraphqlArticles(nodes: GraphQLArticle[]): Article[] {
  return nodes.map(mapGraphqlArticle);
}
