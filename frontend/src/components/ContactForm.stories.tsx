import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ContactForm } from '@/components/ContactForm';
import { FORM_LEVEL_ERROR_KEY } from '@/lib/drupal/errors';

/**
 * The form takes its submit handler as a prop precisely so it can be driven
 * here without a server — every failure mode below is a plain function.
 */
const meta = {
  title: 'Forms/ContactForm',
  component: ContactForm,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'react-hook-form + zod on the client, the same schema re-validated in ' +
          'the Server Action, and any constraint Drupal rejects mapped back onto ' +
          'the field that caused it.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ContactForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { action: async () => ({ ok: true }) },
};

/** Submit succeeds — the form is replaced by a focusable confirmation. */
export const SubmitsSuccessfully: Story = {
  args: {
    action: async () => {
      await new Promise((r) => setTimeout(r, 600));
      return { ok: true };
    },
  },
};

/** Drupal rejected one field: the message lands on that input, not at the top. */
export const ServerRejectsAField: Story = {
  args: {
    action: async () => ({
      ok: false,
      fieldErrors: { email: 'This address is already subscribed.' },
    }),
  },
};

/** Nothing field-specific to say — the message goes above the form. */
export const FormLevelError: Story = {
  args: {
    action: async () => ({
      ok: false,
      fieldErrors: {
        [FORM_LEVEL_ERROR_KEY]:
          'We could not send your message right now. Please try again shortly.',
      },
    }),
  },
};

/** Slow backend: the submit button stays disabled for the whole round trip. */
export const Submitting: Story = {
  args: {
    action: async () => {
      await new Promise((r) => setTimeout(r, 100000));
      return { ok: true };
    },
  },
};
