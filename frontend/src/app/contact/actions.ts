'use server';

import {
  DrupalApiError,
  DrupalValidationError,
  drupalFetch,
} from '@/lib/drupal/client';
import {
  FORM_LEVEL_ERROR_KEY,
  mapDrupalErrorsToFields,
  parseDrupalErrorBody,
} from '@/lib/drupal/errors';
import {
  CONTACT_FIELD_MAP,
  contactSchema,
  type ContactInput,
} from '@/lib/schemas/contact';
import { z } from 'zod';

/**
 * Result of a contact submission.
 *
 * Deliberately a discriminated union rather than a thrown error: a Server
 * Action that throws surfaces to the client as a generic "unexpected response",
 * which loses every per-field message Drupal took the trouble to send.
 */
export type ContactResult =
  { ok: true } | { ok: false; fieldErrors: Record<string, string> };

/** JSON:API returns the created resource; we only care that it parsed. */
const createdResponse = z.object({
  data: z.object({ id: z.string() }),
});

export async function submitContact(
  input: ContactInput,
): Promise<ContactResult> {
  // Re-validate server-side. The client already ran this schema, but the client
  // is not a trust boundary.
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === 'string' && !(field in fieldErrors)) {
        fieldErrors[field] = issue.message;
      }
    }
    return { ok: false, fieldErrors };
  }

  // Honeypot tripped — answer as if it succeeded so the bot learns nothing,
  // but never write anything.
  if (parsed.data.company) {
    return { ok: true };
  }

  try {
    await drupalFetch({
      resource: 'node/contact_message',
      method: 'POST',
      schema: createdResponse,
      next: { revalidate: 0 },
      body: {
        data: {
          type: 'node--contact_message',
          attributes: {
            field_name: parsed.data.name,
            field_email: parsed.data.email,
            field_subject: parsed.data.subject,
            field_message: parsed.data.message,
          },
        },
      },
    });

    return { ok: true };
  } catch (error) {
    if (error instanceof DrupalApiError && error.status === 422) {
      const fieldErrors = mapDrupalErrorsToFields(
        parseDrupalErrorBody(error.body),
        CONTACT_FIELD_MAP,
      );
      return {
        ok: false,
        fieldErrors:
          Object.keys(fieldErrors).length > 0
            ? fieldErrors
            : { [FORM_LEVEL_ERROR_KEY]: 'Drupal rejected the submission.' },
      };
    }

    // Shape drift or transport failure: log server-side, tell the user
    // something generic. Never leak the Drupal URL or payload to the browser.
    console.error(
      '[contact] submission failed',
      error instanceof DrupalValidationError ? error.issues : error,
    );
    return {
      ok: false,
      fieldErrors: {
        [FORM_LEVEL_ERROR_KEY]:
          'We could not send your message right now. Please try again shortly.',
      },
    };
  }
}
