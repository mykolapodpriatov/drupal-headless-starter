// Single-article page. Skeleton: real data wiring + generateStaticParams +
// preview mode handling lands in the next commit.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const revalidate = 60;

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(
  { params }: ArticlePageProps,
): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: slug.replace(/-/g, ' '),
  };
}

export default async function ArticlePage(
  { params }: ArticlePageProps,
): Promise<JSX.Element> {
  const { slug } = await params;
  if (!slug) {
    notFound();
  }
  return (
    <article className="prose-body space-y-6">
      <h1 className="text-3xl font-bold">{slug}</h1>
      <p className="text-[color:var(--color-muted)]">
        Article body will render from Drupal JSON:API once the client lands.
      </p>
    </article>
  );
}
