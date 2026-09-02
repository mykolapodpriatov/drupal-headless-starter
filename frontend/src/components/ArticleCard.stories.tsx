import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ArticleCard } from '@/components/ArticleCard';
import {
  articleFixture,
  articleWithImageFixture,
} from '../../test/fixtures/articles';

const meta = {
  title: 'Content/ArticleCard',
  component: ArticleCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Grid item for the article listing. Takes the `Article` domain model — ' +
          'never a JSON:API resource — so it is unaffected by how Drupal names ' +
          'its fields.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ArticleCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithImage: Story = {
  args: { article: articleWithImageFixture },
};

/** No image: a decorative placeholder keeps the grid rhythm intact. */
export const WithoutImage: Story = {
  args: { article: articleFixture },
};

/** Long titles must wrap rather than truncate — headlines carry the meaning. */
export const LongTitle: Story = {
  args: {
    article: {
      ...articleFixture,
      title:
        'Why decoupling the front end from Drupal does not mean giving up the editorial preview workflow your editors rely on',
    },
  },
};
