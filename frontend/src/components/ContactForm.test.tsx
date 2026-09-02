import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContactForm } from '@/components/ContactForm';
import { FORM_LEVEL_ERROR_KEY } from '@/lib/drupal/errors';

const VALID = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  subject: 'About the analytical engine',
  message: 'I have some notes on the Bernoulli numbers routine.',
};

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/name/i), VALID.name);
  await user.type(screen.getByLabelText(/email/i), VALID.email);
  await user.type(screen.getByLabelText(/subject/i), VALID.subject);
  await user.type(screen.getByLabelText(/message/i), VALID.message);
}

describe('<ContactForm />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks submission and reports every invalid field', async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(<ContactForm action={action} />);

    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findAllByRole('alert')).toHaveLength(4);
    expect(action).not.toHaveBeenCalled();
  });

  it('rejects a malformed email before hitting the server', async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(<ContactForm action={action} />);

    await fillValidForm(user);
    await user.clear(screen.getByLabelText(/email/i));
    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(
      await screen.findByText(/does not look like an email address/i),
    ).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });

  it('submits trimmed values to the action once', async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue({ ok: true });
    render(<ContactForm action={action} />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action).toHaveBeenCalledWith(expect.objectContaining(VALID));
  });

  it('shows a confirmation after a successful submission', async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue({ ok: true });
    render(<ContactForm action={action} />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/on its way/i);
  });

  it('attaches a server-side field error to the field that caused it', async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue({
      ok: false,
      fieldErrors: { email: 'This address is already subscribed.' },
    });
    render(<ContactForm action={action} />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /send message/i }));

    const error = await screen.findByText(/already subscribed/i);
    expect(error).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining(error.id),
    );
  });

  it('renders a form-level error above the fields', async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue({
      ok: false,
      fieldErrors: { [FORM_LEVEL_ERROR_KEY]: 'Drupal is in maintenance mode.' },
    });
    render(<ContactForm action={action} />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByText(/maintenance mode/i)).toBeInTheDocument();
  });

  it('keeps the form on screen when the server rejects it', async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue({
      ok: false,
      fieldErrors: { name: 'Too short.' },
    });
    render(<ContactForm action={action} />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await screen.findByText('Too short.');
    expect(
      screen.getByRole('button', { name: /send message/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('marks an invalid control with aria-invalid', async () => {
    const user = userEvent.setup();
    render(<ContactForm action={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() =>
      expect(screen.getByLabelText(/name/i)).toHaveAttribute(
        'aria-invalid',
        'true',
      ),
    );
  });
});
