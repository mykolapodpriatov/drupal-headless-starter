import Link from 'next/link';

interface LoadMoreLinkProps {
  /** 1-indexed page number the control links to. */
  nextPage: number;
}

/**
 * The article list's pagination control.
 *
 * Server-rendered as a real `<a href="/articles?page=<n>">`, so it works
 * with JavaScript disabled: following the link does a full navigation to a
 * page that shows every article seen so far *plus* the next batch (see
 * `getArticlesListPage`), which is what makes it read as "load more" rather
 * than "jump to the next page" even without a click handler.
 *
 * `next/link` progressively enhances that same anchor into a client-side
 * transition for JS-capable clients, without changing the href a crawler or
 * no-JS browser sees. `scroll={false}` keeps the reader where they clicked:
 * the default behaviour of scrolling back to the top is right for "go to a
 * different page", not for "show me more of this one".
 */
export function LoadMoreLink({ nextPage }: LoadMoreLinkProps) {
  return (
    <div className="flex justify-center pt-4">
      <Link
        href={`/articles?page=${nextPage}`}
        scroll={false}
        className="rounded-md border border-[color:var(--color-border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5"
      >
        Load more
      </Link>
    </div>
  );
}
