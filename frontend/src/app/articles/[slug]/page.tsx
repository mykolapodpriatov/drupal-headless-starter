// Single-article page.
//
// - generateStaticParams pre-builds the top published slugs so the most-read
//   pages serve from cache on the first hit.
// - ISR (revalidate=60) covers everything else and absorbs new content
//   without a redeploy.
// - draftMode() switches into Drupal's working-copy view so editor preview
//   sees unpublished revisions in place.

import type { Metadata } from 'next';
import { draftMode } from 'next/headers';
import { notFound } from 'next/navigation';

import { Article } from '@/components/Article';
import { getArticleBySlug, getArticleSlugs } from '@/lib/drupal/queries';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60;

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  // Pre-render the recent published articles at build time. Anything else
  // falls back to ISR.
  return getArticleSlugs();
}

export async function generateMetadata(
  { params }: ArticlePageProps,
): Promise<Metadata> {
  const { slug } = await params;
  const { isEnabled } = await draftMode();
  const article = await getArticleBySlug(`/articles/${slug}`, { draft: isEnabled });
  if (!article) {
    return { title: 'Not found' };
  }
  return {
    title: article.title,
    description: article.body?.summary ?? undefined,
    openGraph: {
      title: article.title,
      images: article.image ? [{ url: article.image.url }] : [],
    },
  };
}

export default async function ArticlePage(
  { params }: ArticlePageProps,
) {
  const { slug } = await params;
  const { isEnabled: isDraft } = await draftMode();

  const article = await getArticleBySlug(`/articles/${slug}`, { draft: isDraft });
  if (!article) {
    notFound();
  }

  return <Article article={article} isDraft={isDraft} />;
}
