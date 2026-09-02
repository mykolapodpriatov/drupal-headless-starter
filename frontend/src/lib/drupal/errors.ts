// Turning Drupal's JSON:API error document into per-field form errors.
//
// Drupal answers a rejected write with a 422 and a JSON:API error document:
//
//   { "errors": [ { "detail": "field_email.0.value: Not a valid email.",
//                   "source": { "pointer": "/data/attributes/field_email" } } ] }
//
// Two things make this awkward for a form:
//
//   1. the pointer carries the *Drupal* machine name (`field_email`), not the
//      form field name (`email`);
//   2. `detail` repeats the field path before the human-readable sentence.
//
// Translation happens here, through an explicit field map passed by the caller
// — never by guessing (stripping a `field_` prefix would happily invent a form
// field for `field_internal_note`, which the user cannot even see). Anything
// unmapped, or any error without a pointer, becomes a form-level message.
//
// See docs/decisions/001-domain-model-mapping.md — same principle as the read
// path: Drupal's vocabulary stops at the boundary.

/** Key used for errors that belong to the form as a whole, not one field. */
export const FORM_LEVEL_ERROR_KEY = '_form';

export interface DrupalJsonApiError {
  title?: string;
  detail?: string;
  status?: string;
  source?: { pointer?: string };
}

/** Maps a Drupal field machine name to the form field name. */
export type DrupalFieldMap = Readonly<Record<string, string>>;

const POINTER_PREFIX = '/data/attributes/';

/**
 * Pull the `errors` array out of a raw JSON:API error response body.
 *
 * Never throws: a gateway that answers with HTML, or a body with no `errors`
 * member, yields an empty list so the caller can fall back to a generic
 * message instead of a 500.
 */
export function parseDrupalErrorBody(body: string): DrupalJsonApiError[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return [];
  }

  if (typeof parsed !== 'object' || parsed === null) return [];
  const errors = (parsed as { errors?: unknown }).errors;
  if (!Array.isArray(errors)) return [];

  return errors.filter(
    (e): e is DrupalJsonApiError => typeof e === 'object' && e !== null,
  );
}

/** `/data/attributes/field_email` → `field_email`; anything else → null. */
function drupalFieldFromPointer(pointer: string | undefined): string | null {
  if (!pointer || !pointer.startsWith(POINTER_PREFIX)) return null;
  const name = pointer.slice(POINTER_PREFIX.length).split('/')[0];
  return name && name.length > 0 ? name : null;
}

/**
 * Drupal prefixes the constraint message with the field path
 * (`field_name.0.value: This value should not be blank.`). Strip it so the form
 * shows the sentence a human wrote, not the storage path.
 */
function humanMessage(error: DrupalJsonApiError): string {
  const raw = error.detail ?? error.title ?? 'Invalid value.';
  const separator = raw.indexOf(': ');
  if (separator === -1) return raw.trim();

  const prefix = raw.slice(0, separator);
  // Only strip when the prefix really looks like a field path — a message that
  // legitimately contains a colon ("Note: try again") must survive intact.
  return /^[a-z0-9_]+(\.[a-z0-9_]+)*$/i.test(prefix)
    ? raw.slice(separator + 2).trim()
    : raw.trim();
}

/**
 * Collapse a JSON:API error list into `{ formField: message }`.
 *
 * Several errors on one field are joined with a space, so the user sees every
 * reason the value was rejected rather than only the first.
 */
export function mapDrupalErrorsToFields(
  errors: readonly DrupalJsonApiError[],
  fieldMap: DrupalFieldMap,
): Record<string, string> {
  const collected = new Map<string, string[]>();

  for (const error of errors) {
    const drupalField = drupalFieldFromPointer(error.source?.pointer);
    const formField =
      drupalField !== null
        ? (fieldMap[drupalField] ?? FORM_LEVEL_ERROR_KEY)
        : FORM_LEVEL_ERROR_KEY;

    const existing = collected.get(formField) ?? [];
    existing.push(humanMessage(error));
    collected.set(formField, existing);
  }

  return Object.fromEntries(
    [...collected.entries()].map(([field, messages]) => [
      field,
      messages.join(' '),
    ]),
  );
}
