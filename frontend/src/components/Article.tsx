import Image from 'next/image';

import { sanitizeServerHtml } from '@/lib/drupal/sanitize';
import type { Article as ArticleType } from '@/lib/drupal/types';

interface ArticleProps {
  article: ArticleType;
  isDraft?: boolean;
}

export function Article({ article, isDraft = false }: ArticleProps) {
  // body.processed has already been through Drupal's filter format pipeline,
  // so user-authored markup is constrained to basic_html / full_html. We
  // re-sanitise on this side as defence-in-depth (see sanitize.ts).
  const safeHtml = article.body?.processed
    ? sanitizeServerHtml(article.body.processed)
    : '';

  return (
    <article className="space-y-8 prose-body">
      {isDraft ? (
        <div className="rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Preview mode — viewing the working copy. Refresh after publishing to
          see the live version.
        </div>
      ) : null}

      <header className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">{article.title}</h1>
        <time
          dateTime={article.createdAt}
          className="block text-sm text-[color:var(--color-muted)]"
        >
          {new Date(article.createdAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </time>
      </header>

      {article.image ? (
        <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-black/5">
          <Image
            src={article.image.url}
            alt={article.image.alt || article.title}
            fill
            sizes="(min-width: 1024px) 800px, 100vw"
            priority
            className="object-cover"
          />
        </div>
      ) : null}

      {safeHtml ? (
        <div
          // Content is double-sanitised: once by Drupal's basic_html /
          // full_html filter formats server-side, again by sanitizeServerHtml.
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      ) : (
        <p className="text-[color:var(--color-muted)]">
          This article has no body yet.
        </p>
      )}
    </article>
  );
}
