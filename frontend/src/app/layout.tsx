import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import '@/styles/globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'http://localhost:3000',
  ),
  title: {
    default: 'Drupal Headless Starter',
    template: '%s — Drupal Headless Starter',
  },
  description:
    'A decoupled Drupal 11 + Next.js 15 starter — JSON:API and GraphQL on the backend, App Router on the front.',
  openGraph: {
    type: 'website',
    siteName: 'Drupal Headless Starter',
  },
  robots: {
    index: false,
    follow: false,
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <header className="border-b border-black/5 bg-white/70 backdrop-blur">
          <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
            <Link href="/" className="font-semibold text-ink no-underline">
              Drupal Headless Starter
            </Link>
            <nav className="flex gap-6 text-sm">
              <Link href="/articles">Articles</Link>
              <a
                href={process.env.NEXT_PUBLIC_DRUPAL_BASE_URL ?? '#'}
                target="_blank"
                rel="noreferrer"
              >
                Drupal admin
              </a>
            </nav>
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto max-w-5xl px-6 py-12">{children}</div>
        </main>

        <footer className="border-t border-black/5 mt-12">
          <div className="mx-auto max-w-5xl px-6 py-6 text-sm text-[color:var(--color-muted)] flex justify-between">
            <span>Drupal 11 + Next.js 15</span>
            <span>MIT</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
