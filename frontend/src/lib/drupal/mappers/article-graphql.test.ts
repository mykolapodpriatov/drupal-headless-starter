import { describe, expect, it } from 'vitest';

import { mapGraphqlArticle } from '@/lib/drupal/mappers/article-graphql';
import type { GraphQLArticle } from '@/lib/drupal/types';

function node(overrides: Partial<GraphQLArticle> = {}): GraphQLArticle {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    title: 'Decoupling Drupal',
    path: '/articles/decoupling-drupal',
    status: true,
    created: { time: '2026-01-15T10:00:00+00:00' },
    changed: { time: '2026-01-16T12:30:00+00:00' },
    body: {
      value: '<p>raw</p>',
      format: 'basic_html',
      processed: '<p>processed</p>',
      summary: 'A summary',
    },
    image: null,
    ...overrides,
  };
}

describe('mapGraphqlArticle', () => {
  it('flattens a GraphQL Compose node into the domain model', () => {
    const article = mapGraphqlArticle(node());

    expect(article).toMatchObject({
      id: '22222222-2222-4222-8222-222222222222',
      title: 'Decoupling Drupal',
      slug: '/articles/decoupling-drupal',
      createdAt: '2026-01-15T10:00:00+00:00',
      updatedAt: '2026-01-16T12:30:00+00:00',
      published: true,
    });
    expect(article.body?.processed).toBe('<p>processed</p>');
  });

  it('falls back to the node path when there is no path alias', () => {
    const article = mapGraphqlArticle(node({ path: null }));

    expect(article.slug).toBe('/node/22222222-2222-4222-8222-222222222222');
  });

  it('tolerates an article without a body', () => {
    const article = mapGraphqlArticle(node({ body: null }));

    expect(article.body).toBeNull();
  });

  it('maps `status: false` to `published: false`', () => {
    const article = mapGraphqlArticle(node({ status: false }));

    expect(article.published).toBe(false);
  });

  it('returns image: null when the node has no image', () => {
    expect(mapGraphqlArticle(node({ image: null })).image).toBeNull();
  });

  it('canonicalises a relative image URL against the public Drupal base URL', () => {
    const article = mapGraphqlArticle(
      node({
        image: {
          url: '/sites/default/files/hero.jpg',
          alt: 'A wall of server racks',
          width: 1600,
          height: 900,
        },
      }),
    );

    expect(article.image).toEqual({
      url: 'http://localhost/sites/default/files/hero.jpg',
      alt: 'A wall of server racks',
      width: 1600,
      height: 900,
    });
  });

  it('passes an already-absolute image URL through untouched', () => {
    const article = mapGraphqlArticle(
      node({
        image: {
          url: 'https://cdn.example.com/hero.jpg',
          alt: null,
          width: null,
          height: null,
        },
      }),
    );

    expect(article.image?.url).toBe('https://cdn.example.com/hero.jpg');
  });

  it('falls back to an empty alt when GraphQL Compose returns null', () => {
    const article = mapGraphqlArticle(
      node({
        image: {
          url: 'https://cdn.example.com/hero.jpg',
          alt: null,
          width: null,
          height: null,
        },
      }),
    );

    expect(article.image?.alt).toBe('');
  });

  it('does not leak the GraphQL Compose shape into the domain model', () => {
    const article = mapGraphqlArticle(node());

    expect(article).not.toHaveProperty('status');
    expect(article).not.toHaveProperty('path');
    expect(article).not.toHaveProperty('created');
    expect(article).not.toHaveProperty('changed');
  });

  it('produces the same domain-model shape the JSON:API mapper produces', () => {
    const article = mapGraphqlArticle(node());

    expect(Object.keys(article).sort()).toEqual(
      [
        'id',
        'title',
        'slug',
        'createdAt',
        'updatedAt',
        'published',
        'body',
        'image',
      ].sort(),
    );
  });
});
