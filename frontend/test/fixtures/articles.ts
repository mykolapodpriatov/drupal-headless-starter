// Domain-model fixtures shared by unit tests, Storybook and the static demo
// build. Deliberately in the domain shape (not JSON:API) — everything above
// the mapper layer only ever sees `Article`.

import type { Article } from '@/lib/drupal/types';

export const articleFixture: Article = {
  id: '22222222-2222-4222-8222-222222222222',
  title: 'Decoupling Drupal without losing the editorial workflow',
  slug: '/articles/decoupling-drupal',
  createdAt: '2026-01-15T10:00:00+00:00',
  updatedAt: '2026-01-16T12:30:00+00:00',
  published: true,
  body: {
    value: '<p>Editors keep their preview. The frontend keeps its cache.</p>',
    format: 'basic_html',
    processed:
      '<p>Editors keep their preview. The frontend keeps its cache.</p>' +
      '<h2>Why JSON:API</h2><p>Because it is in core.</p>',
    summary: 'Editors keep their preview. The frontend keeps its cache.',
  },
  image: null,
};

export const articleWithImageFixture: Article = {
  ...articleFixture,
  id: '33333333-3333-4333-8333-333333333333',
  title: 'Rendering Drupal media in Next.js',
  slug: '/articles/rendering-drupal-media',
  image: {
    url: 'https://images.example.com/hero.jpg',
    alt: 'A wall of server racks',
    width: 1600,
    height: 900,
  },
};

export const articleWithoutBodyFixture: Article = {
  ...articleFixture,
  id: '44444444-4444-4444-8444-444444444444',
  title: 'A stub article with no body yet',
  slug: '/articles/stub-article',
  body: null,
};

export const draftArticleFixture: Article = {
  ...articleFixture,
  id: '55555555-5555-4555-8555-555555555555',
  title: 'Unpublished: pricing changes for Q2',
  slug: '/articles/pricing-changes-q2',
  published: false,
};

export const articlesFixture: Article[] = [
  articleWithImageFixture,
  articleFixture,
  articleWithoutBodyFixture,
];
