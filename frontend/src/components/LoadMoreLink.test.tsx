import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LoadMoreLink } from '@/components/LoadMoreLink';

describe('LoadMoreLink', () => {
  it('renders a real anchor to the next page, so it works with JS disabled', () => {
    render(<LoadMoreLink nextPage={2} />);

    const link = screen.getByRole('link', { name: 'Load more' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/articles?page=2');
  });

  it('links to whichever page number it is given', () => {
    render(<LoadMoreLink nextPage={5} />);

    expect(screen.getByRole('link', { name: 'Load more' })).toHaveAttribute(
      'href',
      '/articles?page=5',
    );
  });
});
