// One schema, both sides of the wire.
//
// The client validates with it through @hookform/resolvers so the user gets
// instant feedback; the Server Action validates with the *same* schema before
// touching Drupal, because a client-side check is a UX affordance, not a
// security boundary. Keeping a single definition means the two can never drift.

import { z } from 'zod';

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tell us your name.')
    .max(100, 'Name must be 100 characters or fewer.'),
  email: z
    .string()
    .trim()
    .min(1, 'We need an email address to reply to.')
    .email('That does not look like an email address.'),
  subject: z
    .string()
    .trim()
    .min(1, 'Add a subject.')
    .max(200, 'Subject must be 200 characters or fewer.'),
  message: z
    .string()
    .trim()
    .min(10, 'Please write at least 10 characters.')
    .max(5000, 'Message must be 5000 characters or fewer.'),
  // Honeypot: hidden from humans, irresistible to naive bots. A non-empty
  // value fails validation without telling the submitter why.
  company: z.string().max(0, 'Submission rejected.').optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

/**
 * Form field ↔ Drupal machine name. Used to translate 422 responses back into
 * per-field errors; see lib/drupal/errors.ts for why this is explicit.
 */
export const CONTACT_FIELD_MAP = {
  field_name: 'name',
  field_email: 'email',
  field_subject: 'subject',
  field_message: 'message',
} as const;
