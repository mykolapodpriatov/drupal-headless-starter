import { describe, expect, it } from 'vitest';

import { buildJsonApiQuery } from './client';

// Parse the serialized query string back into URLSearchParams so value
// assertions are decoded (brackets survive the round-trip) and independent of
// param ordering. Raw-string checks below cover the on-the-wire encoding.
function parse(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe('buildJsonApiQuery', () => {
  describe('filter[...]', () => {
    it('encodes a single filter key/value', () => {
      const params = parse(buildJsonApiQuery({ filter: { status: '1' } }));
      expect(params.get('filter[status]')).toBe('1');
    });

    it('encodes multiple filter keys', () => {
      const params = parse(
        buildJsonApiQuery({
          filter: { 'field_category.name': 'news', status: '1' },
        }),
      );
      expect(params.get('filter[field_category.name]')).toBe('news');
      expect(params.get('filter[status]')).toBe('1');
    });

    it('percent-encodes the brackets on the wire', () => {
      const query = buildJsonApiQuery({ filter: { promote: '1' } });
      expect(query).toContain('filter%5Bpromote%5D=1');
    });

    it('coerces boolean filter values to string', () => {
      const params = parse(
        buildJsonApiQuery({ filter: { promote: true, sticky: false } }),
      );
      expect(params.get('filter[promote]')).toBe('true');
      expect(params.get('filter[sticky]')).toBe('false');
    });

    it('coerces number filter values to string', () => {
      const params = parse(buildJsonApiQuery({ filter: { nid: 42 } }));
      expect(params.get('filter[nid]')).toBe('42');
    });

    it('coerces a zero number filter value', () => {
      const params = parse(buildJsonApiQuery({ filter: { weight: 0 } }));
      expect(params.get('filter[weight]')).toBe('0');
    });
  });

  describe('include', () => {
    it('joins includes with a comma', () => {
      const params = parse(
        buildJsonApiQuery({ include: ['field_image', 'uid.user_picture'] }),
      );
      expect(params.get('include')).toBe('field_image,uid.user_picture');
    });

    it('omits include for an empty array', () => {
      expect(buildJsonApiQuery({ include: [] })).toBe('');
    });
  });

  describe('fields[type]', () => {
    it('joins field names per resource type', () => {
      const params = parse(
        buildJsonApiQuery({
          fields: {
            'node--article': ['title', 'body'],
            'user--user': ['name'],
          },
        }),
      );
      expect(params.get('fields[node--article]')).toBe('title,body');
      expect(params.get('fields[user--user]')).toBe('name');
    });

    it('percent-encodes the type brackets on the wire', () => {
      const query = buildJsonApiQuery({
        fields: { 'node--article': ['title'] },
      });
      expect(query).toContain('fields%5Bnode--article%5D=title');
    });
  });

  describe('sort', () => {
    it('joins sort fields with a comma preserving direction prefixes', () => {
      const params = parse(buildJsonApiQuery({ sort: ['-created', 'title'] }));
      expect(params.get('sort')).toBe('-created,title');
    });

    it('omits sort for an empty array', () => {
      expect(buildJsonApiQuery({ sort: [] })).toBe('');
    });
  });

  describe('page[offset|limit]', () => {
    it('encodes offset and limit', () => {
      const params = parse(
        buildJsonApiQuery({ page: { offset: 10, limit: 20 } }),
      );
      expect(params.get('page[offset]')).toBe('10');
      expect(params.get('page[limit]')).toBe('20');
    });

    it('encodes a zero offset (not treated as absent)', () => {
      const params = parse(buildJsonApiQuery({ page: { offset: 0 } }));
      expect(params.get('page[offset]')).toBe('0');
      expect(params.has('page[limit]')).toBe(false);
    });

    it('encodes only the provided page key', () => {
      const params = parse(buildJsonApiQuery({ page: { limit: 5 } }));
      expect(params.has('page[offset]')).toBe(false);
      expect(params.get('page[limit]')).toBe('5');
    });

    it('omits page params for an empty page object', () => {
      expect(buildJsonApiQuery({ page: {} })).toBe('');
    });

    it('percent-encodes the page brackets on the wire', () => {
      const query = buildJsonApiQuery({ page: { limit: 20 } });
      expect(query).toContain('page%5Blimit%5D=20');
    });
  });

  describe('resourceVersion', () => {
    it('encodes the resourceVersion param', () => {
      const params = parse(
        buildJsonApiQuery({ resourceVersion: 'rel:working-copy' }),
      );
      expect(params.get('resourceVersion')).toBe('rel:working-copy');
    });
  });

  describe('empty / omitted params', () => {
    it('returns an empty string for an empty query', () => {
      expect(buildJsonApiQuery({})).toBe('');
    });

    it('omits undefined sections and keeps only what was provided', () => {
      const params = parse(buildJsonApiQuery({ include: ['field_image'] }));
      expect(params.get('include')).toBe('field_image');
      expect(params.has('sort')).toBe(false);
      expect(params.has('page[offset]')).toBe(false);
      expect(params.has('resourceVersion')).toBe(false);
      expect([...params.keys()]).toEqual(['include']);
    });

    it('composes every section together', () => {
      const params = parse(
        buildJsonApiQuery({
          filter: { status: '1' },
          include: ['field_image'],
          fields: { 'node--article': ['title'] },
          sort: ['-created'],
          page: { offset: 0, limit: 10 },
          resourceVersion: 'rel:working-copy',
        }),
      );
      expect(params.get('filter[status]')).toBe('1');
      expect(params.get('include')).toBe('field_image');
      expect(params.get('fields[node--article]')).toBe('title');
      expect(params.get('sort')).toBe('-created');
      expect(params.get('page[offset]')).toBe('0');
      expect(params.get('page[limit]')).toBe('10');
      expect(params.get('resourceVersion')).toBe('rel:working-copy');
    });
  });
});
