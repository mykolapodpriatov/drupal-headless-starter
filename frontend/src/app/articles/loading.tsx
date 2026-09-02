import { ArticleListSkeleton } from '@/components/ArticleCardSkeleton';

export default function ArticlesLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading articles…</span>
      <header className="space-y-2">
        <div className="h-9 w-40 animate-pulse rounded bg-black/10" aria-hidden />
        <div className="h-4 w-56 animate-pulse rounded bg-black/5" aria-hidden />
      </header>
      <ArticleListSkeleton />
    </div>
  );
}
