import { describe, expect, it } from 'vitest';

import { extractNextPageLink } from './client';

describe('extractNextPageLink', () => {
  it('reads a `{ href }` shaped next link', () => {
    expect(
      extractNextPageLink({
        next: { href: 'http://localhost/jsonapi/articles?page[offset]=24' },
      }),
    ).toBe('http://localhost/jsonapi/articles?page[offset]=24');
  });

  it('reads a bare string next link', () => {
    expect(
      extractNextPageLink({
        next: 'http://localhost/jsonapi/articles?page[offset]=24',
      }),
    ).toBe('http://localhost/jsonapi/articles?page[offset]=24');
  });

  it('returns null when there is no next link', () => {
    expect(extractNextPageLink({ self: { href: 'http://localhost/x' } })).toBe(
      null,
    );
  });

  it('returns null for links: undefined', () => {
    expect(extractNextPageLink(undefined)).toBe(null);
  });

  it('returns null for a non-object links value', () => {
    expect(extractNextPageLink('not-an-object')).toBe(null);
  });

  it('returns null for an empty href', () => {
    expect(extractNextPageLink({ next: { href: '' } })).toBe(null);
  });

  it('returns null for an empty string next link', () => {
    expect(extractNextPageLink({ next: '' })).toBe(null);
  });

  it('returns null when next has no href property', () => {
    expect(extractNextPageLink({ next: {} })).toBe(null);
  });
});
