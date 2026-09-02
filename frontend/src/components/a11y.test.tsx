// One place that asserts every component renders without a serious or critical
// accessibility violation. Kept together rather than sprinkled through each
// component's spec so it is obvious at a glance which components are covered —
// and so adding a component without covering it stands out in review.

import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, vi } from 'vitest';

import { Article } from '@/components/Article';
import { ArticleCard } from '@/components/ArticleCard';
import { ArticleListSkeleton } from '@/components/ArticleCardSkeleton';
import { ContactForm } from '@/components/ContactForm';
import { ErrorState } from '@/components/ErrorState';
import {
  articleFixture,
  articleWithImageFixture,
  articlesFixture,
} from '../../test/fixtures/articles';
import { expectNoA11yViolations } from '../../test/a11y';

describe('accessibility', () => {
  it('ArticleCard has no violations', async () => {
    const { container } = render(
      <ul>
        {articlesFixture.map((a) => (
          <li key={a.id}>
            <ArticleCard article={a} />
          </li>
        ))}
      </ul>,
    );

    await expectNoA11yViolations(container);
  });

  it('Article has no violations', async () => {
    const { container } = render(<Article article={articleWithImageFixture} />);

    await expectNoA11yViolations(container);
  });

  it('Article in draft mode has no violations', async () => {
    const { container } = render(<Article article={articleFixture} isDraft />);

    await expectNoA11yViolations(container);
  });

  it('ArticleListSkeleton has no violations', async () => {
    const { container } = render(<ArticleListSkeleton />);

    await expectNoA11yViolations(container);
  });

  it('ErrorState has no violations', async () => {
    const { container } = render(
      <ErrorState reset={() => undefined} error={Object.assign(new Error('x'), { digest: 'd1' })} />,
    );

    await expectNoA11yViolations(container);
  });

  it('ContactForm has no violations when empty', async () => {
    const { container } = render(<ContactForm action={vi.fn()} />);

    await expectNoA11yViolations(container);
  });

  it('ContactForm has no violations while showing errors', async () => {
    const user = userEvent.setup();
    const { container, findAllByRole } = render(<ContactForm action={vi.fn()} />);

    await user.click(container.querySelector('button[type="submit"]')!);
    await findAllByRole('alert');

    await expectNoA11yViolations(container);
  });
});
