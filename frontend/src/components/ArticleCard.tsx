import Image from 'next/image';
import Link from 'next/link';

import type { Article } from '@/lib/drupal/types';

interface ArticleCardProps {
  article: Article;
}

export function ArticleCard({ article }: ArticleCardProps) {
  // Normalise the slug — Drupal hands us "/articles/foo", the route wants "foo".
  const href = article.slug.startsWith('/articles/')
    ? article.slug
    : `/articles/${article.slug.replace(/^\//, '')}`;

  return (
    <Link
      href={href}
      className="group block rounded-lg border border-black/10 overflow-hidden no-underline hover:shadow-md transition-shadow"
    >
      {article.image ? (
        <div className="aspect-[16/9] relative bg-black/5">
          <Image
            src={article.image.url}
            alt={article.image.alt || article.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="aspect-[16/9] bg-black/5" aria-hidden />
      )}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-ink group-hover:text-[color:var(--color-accent)] transition-colors">
          {article.title}
        </h3>
        <time
          dateTime={article.createdAt}
          className="block text-xs text-[color:var(--color-muted)]"
        >
          {new Date(article.createdAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </time>
      </div>
    </Link>
  );
}
