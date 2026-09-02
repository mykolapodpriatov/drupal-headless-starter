import { ArticleListSkeleton } from '@/components/ArticleCardSkeleton';

/** Root-level fallback for a full navigation before the segment resolves. */
export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="h-9 w-48 animate-pulse rounded bg-black/10" aria-hidden />
      <ArticleListSkeleton />
    </div>
  );
}
