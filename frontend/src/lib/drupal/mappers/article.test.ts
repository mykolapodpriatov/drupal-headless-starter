import { describe, expect, it } from 'vitest';

import { mapArticle } from '@/lib/drupal/mappers/article';
import type { ArticleResource, FileResource } from '@/lib/drupal/types';

const FILE_ID = '11111111-1111-4111-8111-111111111111';

function resource(overrides: Partial<ArticleResource> = {}): ArticleResource {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    type: 'node--article',
    attributes: {
      title: 'Decoupling Drupal',
      published: true,
      slug: '/articles/decoupling-drupal',
      createdAt: '2026-01-15T10:00:00+00:00',
      updatedAt: '2026-01-16T12:30:00+00:00',
      body: {
        value: '<p>raw</p>',
        format: 'basic_html',
        processed: '<p>processed</p>',
        summary: 'A summary',
      },
      ...(overrides.attributes ?? {}),
    },
    ...(overrides.relationships !== undefined
      ? { relationships: overrides.relationships }
      : {}),
  };
}

function file(url: string): FileResource {
  return {
    id: FILE_ID,
    type: 'file--file',
    attributes: {
      uri: { value: 'public://hero.jpg', url },
      filemime: 'image/jpeg',
      filesize: 2048,
    },
  };
}

describe('mapArticle', () => {
  it('flattens a JSON:API resource into the domain model', () => {
    const article = mapArticle(resource(), undefined);

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

  it('falls back to the node path when the alias is missing', () => {
    const article = mapArticle(
      resource({ attributes: { slug: null } as ArticleResource['attributes'] }),
      undefined,
    );

    expect(article.slug).toBe('/node/22222222-2222-4222-8222-222222222222');
  });

  it('tolerates an article without a body', () => {
    const article = mapArticle(
      resource({ attributes: { body: null } as ArticleResource['attributes'] }),
      undefined,
    );

    expect(article.body).toBeNull();
  });

  it('returns image: null when the article has no image relationship', () => {
    expect(mapArticle(resource(), [file('/sites/default/files/a.jpg')]).image).
      toBeNull();
  });

  it('returns image: null when the referenced file is not in `included`', () => {
    const article = mapArticle(
      resource({
        relationships: { image: { data: { id: FILE_ID, type: 'file--file' } } },
      }),
      [],
    );

    expect(article.image).toBeNull();
  });

  it('canonicalises a relative file URL against the public Drupal base URL', () => {
    const article = mapArticle(
      resource({
        relationships: { image: { data: { id: FILE_ID, type: 'file--file' } } },
      }),
      [file('/sites/default/files/hero.jpg')],
    );

    expect(article.image?.url).toBe(
      'http://localhost/sites/default/files/hero.jpg',
    );
  });

  it('passes an already-absolute file URL through untouched', () => {
    const article = mapArticle(
      resource({
        relationships: { image: { data: { id: FILE_ID, type: 'file--file' } } },
      }),
      [file('https://cdn.example.com/hero.jpg')],
    );

    expect(article.image?.url).toBe('https://cdn.example.com/hero.jpg');
  });

  it('does not leak JSON:API shape into the domain model', () => {
    const article = mapArticle(resource(), undefined);

    expect(article).not.toHaveProperty('attributes');
    expect(article).not.toHaveProperty('relationships');
    expect(article).not.toHaveProperty('type');
  });
});
