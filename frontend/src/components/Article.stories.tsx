import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Article } from '@/components/Article';
import {
  articleFixture,
  articleWithImageFixture,
  articleWithoutBodyFixture,
} from '../../test/fixtures/articles';

const meta = {
  title: 'Content/Article',
  component: Article,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Article>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Published: Story = {
  args: { article: articleFixture },
};

export const WithHeroImage: Story = {
  args: { article: articleWithImageFixture },
};

/** Draft mode: the banner tells the editor they are looking at a working copy. */
export const DraftPreview: Story = {
  args: { article: articleFixture, isDraft: true },
};

/** A node created but not yet written — the body slot must not collapse. */
export const EmptyBody: Story = {
  args: { article: articleWithoutBodyFixture },
};

/**
 * Body markup that survived Drupal's filter format is sanitised again on this
 * side; the script tag below never reaches the DOM.
 */
export const HostileMarkup: Story = {
  args: {
    article: {
      ...articleFixture,
      body: {
        ...articleFixture.body!,
        processed:
          '<p>Content before.</p><script>window.pwned = true;</script>' +
          '<p onclick="steal()">Content after.</p>',
      },
    },
  },
};
