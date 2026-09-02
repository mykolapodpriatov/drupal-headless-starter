import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ErrorState } from '@/components/ErrorState';

describe('<ErrorState />', () => {
  it('announces the failure to assistive technology', () => {
    render(<ErrorState />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders the supplied title and description', () => {
    render(<ErrorState title="Articles unavailable" description="Drupal is down." />);

    expect(
      screen.getByRole('heading', { name: 'Articles unavailable' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Drupal is down.')).toBeInTheDocument();
  });

  it('calls reset when the retry button is pressed', async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    render(<ErrorState reset={reset} />);

    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('omits the retry button when there is nothing to retry', () => {
    render(<ErrorState />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the digest so a server-side log entry can be found', () => {
    const error = Object.assign(new Error('boom'), { digest: 'abc123' });
    render(<ErrorState error={error} />);

    expect(screen.getByText('abc123')).toBeInTheDocument();
  });

  it('never leaks the error message to the browser', () => {
    const error = Object.assign(
      new Error('Drupal returned 500 for http://drupal.internal/jsonapi/articles?filter[secret]=x'),
      { digest: 'abc123' },
    );
    render(<ErrorState error={error} />);

    expect(screen.queryByText(/drupal\.internal/)).not.toBeInTheDocument();
    expect(screen.queryByText(/filter\[secret\]/)).not.toBeInTheDocument();
  });
});
