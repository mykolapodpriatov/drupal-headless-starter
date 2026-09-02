import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ArticleListSkeleton } from '@/components/ArticleCardSkeleton';

const meta = {
  title: 'Feedback/ArticleListSkeleton',
  component: ArticleListSkeleton,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Suspense fallback for the article grid. Mirrors ArticleCard geometry ' +
          'so the layout does not shift when content arrives, and is aria-hidden ' +
          'because "loading, loading, loading" helps nobody.',
      },
    },
  },
} satisfies Meta<typeof ArticleListSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FullGrid: Story = { args: { count: 6 } };
export const SingleRow: Story = { args: { count: 3 } };
