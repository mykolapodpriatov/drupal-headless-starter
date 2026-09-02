import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  ArticleCardSkeleton,
  ArticleListSkeleton,
} from '@/components/ArticleCardSkeleton';

describe('<ArticleCardSkeleton />', () => {
  it('is hidden from assistive technology', () => {
    const { container } = render(<ArticleCardSkeleton />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden');
  });

  it('exposes no text content to read out', () => {
    const { container } = render(<ArticleCardSkeleton />);

    expect(container.textContent).toBe('');
  });
});

describe('<ArticleListSkeleton />', () => {
  it('renders one placeholder per expected card', () => {
    render(<ArticleListSkeleton count={4} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('defaults to a full grid', () => {
    render(<ArticleListSkeleton />);

    expect(screen.getAllByRole('listitem')).toHaveLength(6);
  });
});
