import Link from 'next/link';

/**
 * Segment-level 404. Distinct from the root not-found so a missing article can
 * say something useful — and point back at the list — instead of a bare 404.
 */
export default function ArticleNotFound() {
  return (
    <div className="space-y-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Article not found</h1>
      <p className="text-[color:var(--color-muted)]">
        It may have been unpublished or its URL alias changed.{' '}
        <Link href="/articles">Browse all articles</Link>.
      </p>
    </div>
  );
}
