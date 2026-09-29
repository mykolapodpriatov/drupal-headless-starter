// JSON:API payloads the mock backend serves. Deliberately written in Drupal's
// transport shape (attributes/relationships/included) rather than the domain
// model — the point of these tests is to exercise the real client + mapper
// path, so anything pre-flattened would test nothing.

export const FILE_ID = '11111111-1111-4111-8111-111111111111';

export const files = [
  {
    id: FILE_ID,
    type: 'file--file',
    attributes: {
      uri: { value: 'public://hero.jpg', url: '/sites/default/files/hero.jpg' },
      filemime: 'image/jpeg',
      filesize: 20480,
    },
  },
];

function article({
  id,
  title,
  slug,
  published = true,
  body,
  withImage = false,
}) {
  return {
    id,
    type: 'node--article',
    attributes: {
      title,
      published,
      slug,
      createdAt: '2026-01-15T10:00:00+00:00',
      updatedAt: '2026-01-16T12:30:00+00:00',
      body: body ?? {
        value: `<p>${title} body.</p>`,
        format: 'basic_html',
        processed: `<p>${title} body.</p><h2>Section</h2><p>More text.</p>`,
        summary: `${title} summary.`,
      },
    },
    ...(withImage
      ? {
          relationships: {
            image: { data: { id: FILE_ID, type: 'file--file' } },
          },
        }
      : {}),
  };
}

/**
 * Deterministic, valid-UUID ids for the filler articles below: hex digits
 * only, version/variant nibbles fixed so `drupalIdSchema` (`z.string().uuid()`)
 * accepts them.
 */
function fillerId(n) {
  return `66666${String(n).padStart(3, '0')}-6666-4666-8666-666666666666`;
}

// One page's worth (24) plus a few more, so the "Load more" / cursor-paging
// e2e tests exercise a real second page instead of asserting against a pool
// too small to ever paginate. The three articles other specs assert on by
// title/slug stay first so they land on page 1 regardless of page size.
const FILLER_COUNT = 23;
const fillerArticles = Array.from({ length: FILLER_COUNT }, (_, i) =>
  article({
    id: fillerId(i + 1),
    title: `Filler article ${i + 1}`,
    slug: `/articles/filler-${i + 1}`,
  }),
);

export const publishedArticles = [
  article({
    id: '22222222-2222-4222-8222-222222222222',
    title: 'Decoupling Drupal',
    slug: '/articles/decoupling-drupal',
    withImage: true,
  }),
  article({
    id: '33333333-3333-4333-8333-333333333333',
    title: 'Rendering Drupal media in Next.js',
    slug: '/articles/rendering-drupal-media',
  }),
  article({
    id: '44444444-4444-4444-8444-444444444444',
    title: 'Cache invalidation with revalidateTag',
    slug: '/articles/cache-invalidation',
  }),
  ...fillerArticles,
];

/** Only visible through the working-copy revision, i.e. in preview mode. */
export const draftArticle = article({
  id: '55555555-5555-4555-8555-555555555555',
  title: 'Unpublished pricing changes',
  slug: '/articles/pricing-changes',
  published: false,
  body: {
    value: '<p>Draft only.</p>',
    format: 'basic_html',
    processed: '<p>This paragraph exists only in the working copy.</p>',
    summary: null,
  },
});
