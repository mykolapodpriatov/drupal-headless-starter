import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Article } from '@/components/Article';
import {
  articleFixture,
  articleWithImageFixture,
  articleWithoutBodyFixture,
} from '../../test/fixtures/articles';

describe('<Article />', () => {
  it('renders the title as the page heading', () => {
    render(<Article article={articleFixture} />);

    expect(
      screen.getByRole('heading', { level: 1, name: articleFixture.title }),
    ).toBeInTheDocument();
  });

  it('renders the processed body HTML', () => {
    render(<Article article={articleFixture} />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Why JSON:API' }),
    ).toBeInTheDocument();
  });

  it('shows a placeholder when the article has no body', () => {
    render(<Article article={articleWithoutBodyFixture} />);

    expect(
      screen.getByText('This article has no body yet.'),
    ).toBeInTheDocument();
  });

  it('hides the preview banner on a published view', () => {
    render(<Article article={articleFixture} />);

    expect(screen.queryByText(/Preview mode/i)).not.toBeInTheDocument();
  });

  it('shows the preview banner in draft mode', () => {
    render(<Article article={articleFixture} isDraft />);

    expect(screen.getByText(/Preview mode/i)).toBeInTheDocument();
  });

  it('renders the hero image when present', () => {
    render(<Article article={articleWithImageFixture} />);

    expect(
      screen.getByRole('img', { name: 'A wall of server racks' }),
    ).toBeInTheDocument();
  });

  it('strips script tags that survived the Drupal filter format', () => {
    const hostile = {
      ...articleFixture,
      body: {
        ...articleFixture.body!,
        processed: '<p>safe</p><script>window.pwned = true;</script>',
      },
    };
    const { container } = render(<Article article={hostile} />);

    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText('safe')).toBeInTheDocument();
  });

  it('strips inline event handlers from body markup', () => {
    const hostile = {
      ...articleFixture,
      body: {
        ...articleFixture.body!,
        processed: '<p onclick="steal()">click me</p>',
      },
    };
    const { container } = render(<Article article={hostile} />);

    expect(container.querySelector('[onclick]')).toBeNull();
  });
});
