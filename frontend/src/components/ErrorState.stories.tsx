import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ErrorState } from '@/components/ErrorState';

const meta = {
  title: 'Feedback/ErrorState',
  component: ErrorState,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Rendered by every error boundary. Never prints `error.message` — a ' +
          'Drupal error can carry the backend URL, the query string or part of ' +
          'the payload. Only the digest is surfaced, which is enough to locate ' +
          'the real trace in the server log.',
      },
    },
  },
} satisfies Meta<typeof ErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Retryable: Story = {
  args: { reset: () => undefined },
};

/** Some boundaries have nothing to retry — the button disappears entirely. */
export const NotRetryable: Story = {
  args: {},
};

export const WithDigest: Story = {
  args: {
    reset: () => undefined,
    error: Object.assign(
      new Error(
        'Drupal returned 500 for http://drupal.internal/jsonapi/articles',
      ),
      { digest: '3f7a1c9e' },
    ),
  },
};

export const ArticleSpecific: Story = {
  args: {
    title: 'This article could not be loaded',
    description:
      'The backend answered, but not in a shape this page can render. Retrying often clears it.',
    reset: () => undefined,
  },
};
