import { describe, expect, it } from 'vitest';

import {
  FORM_LEVEL_ERROR_KEY,
  mapDrupalErrorsToFields,
  parseDrupalErrorBody,
} from '@/lib/drupal/errors';

const FIELD_MAP = {
  field_name: 'name',
  field_email: 'email',
  field_subject: 'subject',
  field_message: 'message',
} as const;

describe('mapDrupalErrorsToFields', () => {
  it('maps a JSON:API pointer to the matching form field', () => {
    const result = mapDrupalErrorsToFields(
      [
        {
          detail: 'field_email.0.value: This value is not a valid email address.',
          source: { pointer: '/data/attributes/field_email' },
        },
      ],
      FIELD_MAP,
    );

    expect(result).toEqual({
      email: 'This value is not a valid email address.',
    });
  });

  it('joins multiple errors on the same field into one message', () => {
    const result = mapDrupalErrorsToFields(
      [
        { detail: 'Too short.', source: { pointer: '/data/attributes/field_message' } },
        { detail: 'Contains a blocked word.', source: { pointer: '/data/attributes/field_message' } },
      ],
      FIELD_MAP,
    );

    expect(result.message).toBe('Too short. Contains a blocked word.');
  });

  it('routes an error without a pointer to the form-level key', () => {
    const result = mapDrupalErrorsToFields(
      [{ detail: 'Access denied.' }],
      FIELD_MAP,
    );

    expect(result[FORM_LEVEL_ERROR_KEY]).toBe('Access denied.');
  });

  it('routes an unmapped Drupal field to the form-level key rather than inventing a field', () => {
    const result = mapDrupalErrorsToFields(
      [
        {
          detail: 'field_internal_note: not allowed.',
          source: { pointer: '/data/attributes/field_internal_note' },
        },
      ],
      FIELD_MAP,
    );

    expect(result).not.toHaveProperty('field_internal_note');
    expect(result[FORM_LEVEL_ERROR_KEY]).toContain('not allowed');
  });

  it('strips the Drupal field prefix from the message body', () => {
    const result = mapDrupalErrorsToFields(
      [
        {
          detail: 'field_name.0.value: This value should not be blank.',
          source: { pointer: '/data/attributes/field_name' },
        },
      ],
      FIELD_MAP,
    );

    expect(result.name).toBe('This value should not be blank.');
  });

  it('falls back to the error title when there is no detail', () => {
    const result = mapDrupalErrorsToFields(
      [
        {
          title: 'Unprocessable Entity',
          source: { pointer: '/data/attributes/field_subject' },
        },
      ],
      FIELD_MAP,
    );

    expect(result.subject).toBe('Unprocessable Entity');
  });

  it('returns an empty object for an empty error list', () => {
    expect(mapDrupalErrorsToFields([], FIELD_MAP)).toEqual({});
  });
});

describe('parseDrupalErrorBody', () => {
  it('extracts the errors array from a JSON:API error document', () => {
    const errors = parseDrupalErrorBody(
      JSON.stringify({
        errors: [{ detail: 'Nope.', source: { pointer: '/data/attributes/field_email' } }],
      }),
    );

    expect(errors).toHaveLength(1);
    expect(errors[0]?.detail).toBe('Nope.');
  });

  it('returns an empty array for a non-JSON body', () => {
    expect(parseDrupalErrorBody('<html>502 Bad Gateway</html>')).toEqual([]);
  });

  it('returns an empty array when the document has no errors member', () => {
    expect(parseDrupalErrorBody(JSON.stringify({ data: null }))).toEqual([]);
  });

  it('ignores malformed entries inside the errors array', () => {
    const errors = parseDrupalErrorBody(
      JSON.stringify({ errors: ['nope', 42, { detail: 'ok' }] }),
    );

    expect(errors).toEqual([{ detail: 'ok' }]);
  });
});
