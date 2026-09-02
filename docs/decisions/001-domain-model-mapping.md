# ADR 001 — Drupal entities are mapped into frontend domain models

**Status:** accepted · **Date:** 2026-09-02

## Context

Drupal's JSON:API delivers a transport shape, not a domain shape:

```json
{
  "data": [{
    "id": "…", "type": "node--article",
    "attributes": { "title": "…", "body": { "processed": "…" } },
    "relationships": { "image": { "data": { "id": "…", "type": "file--file" } } }
  }],
  "included": [{ "id": "…", "type": "file--file", "attributes": { "uri": { "url": "/sites/…" } } }]
}
```

Consuming that directly in components means every component knows that an
image is a pointer into a sibling `included` array, that body text lives at
`attributes.body.processed`, and that file URLs arrive site-relative. Rename a
field in Drupal — a routine editorial-model change, and `jsonapi_extras` makes
renaming easy — and every component that touched it breaks.

It also makes components untestable without constructing JSON:API envelopes by
hand, and makes Storybook fixtures a second, drifting copy of the transport
shape.

## Decision

A mapper layer sits between the client and everything above it:

```
Drupal JSON:API → drupalFetch (+ zod) → mapper → domain model → React
```

- `lib/drupal/client.ts` owns transport: auth, query-string construction,
  the 401 retry, and zod validation of the response envelope.
- `lib/drupal/mappers/article.ts` owns translation. Pure functions, no
  `server-only`, so tests and Storybook can call them.
- `lib/drupal/types.ts` declares both the JSON:API schemas and the domain model
  (`Article`), which is flat: `{ id, title, slug, createdAt, updatedAt,
  published, body, image }`.
- Nothing above the mapper may reference `attributes`, `relationships` or
  `included`. There is a test asserting the domain model carries none of them.

The same principle governs the write path. A rejected write comes back as a
JSON:API error document keyed by Drupal machine names; `lib/drupal/errors.ts`
translates those into form field names **through an explicit map**, never by
stripping a `field_` prefix. Guessing would happily attach an error about
`field_internal_note` to an input the user cannot see. Unmapped fields become
a form-level message.

## Consequences

**Good.** Renaming a Drupal field changes exactly one file. Components take
plain objects, so component tests and Storybook stories share one set of
fixtures with no JSON:API boilerplate. The mapper is where URL canonicalisation
and fallbacks (`slug ?? /node/<uuid>`) live, so they cannot be forgotten at one
of three call sites.

**Cost.** One more layer, and a field added in Drupal must be added in three
places: the zod schema, the domain type, and the mapper. That is deliberate —
each is a decision (is it validated? is it part of the domain? how is it
shaped?), and making them explicit is the point.

## Alternatives considered

**Consume JSON:API directly in components.** Fewer files, and fine for a
throwaway. It couples the UI to the editorial model and makes every component
test build an envelope by hand.

**Generate TypeScript types from the JSON:API schema.** Gives type safety
without hand-written schemas, but generated types describe the *transport*
shape — the coupling problem is unchanged, and the generator becomes a build
dependency. Worth revisiting for the zod schemas specifically; it does not
replace the mapper.

**A client library such as next-drupal.** More features out of the box. This
repo is a teaching starter: the point is that the seam is visible and yours.
