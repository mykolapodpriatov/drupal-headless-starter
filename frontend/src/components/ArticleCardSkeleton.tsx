/**
 * Placeholder shown while the article list streams in.
 *
 * Mirrors ArticleCard's geometry — same 16:9 media box, same padding, same two
 * text rows — so the layout does not jump when the real content replaces it.
 * Hidden from assistive technology: a screen-reader user gains nothing from
 * "loading, loading, loading"; the surrounding region announces the state.
 */
export function ArticleCardSkeleton() {
  return (
    <div
      aria-hidden
      className="animate-pulse overflow-hidden rounded-lg border border-[color:var(--color-border)]"
    >
      <div className="aspect-[16/9] bg-black/5" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 rounded bg-black/10" />
        <div className="h-3 w-1/3 rounded bg-black/5" />
      </div>
    </div>
  );
}

/** A grid of skeletons matching the article list layout. */
export function ArticleListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <ArticleCardSkeleton />
        </li>
      ))}
    </ul>
  );
}
