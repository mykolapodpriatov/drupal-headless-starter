import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LoadMoreLink } from '@/components/LoadMoreLink';

const meta = {
  title: 'Content/LoadMoreLink',
  component: LoadMoreLink,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The article list pagination control. Renders as a real ' +
          '`<a href="/articles?page=<n>">`, so it keeps working with ' +
          'JavaScript disabled. See docs/decisions/002-caching-and-invalidation.md ' +
          'and the "Load more" flow in lib/drupal/queries.ts.',
      },
    },
  },
} satisfies Meta<typeof LoadMoreLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NextPage: Story = { args: { nextPage: 2 } };
export const LaterPage: Story = { args: { nextPage: 5 } };
