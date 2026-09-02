# ADR 002 — Caching: ISR plus tag invalidation, not one or the other

**Status:** accepted · **Date:** 2026-09-02

## Context

A decoupled front end has to answer: when an editor publishes, how soon does
the public site change?

Time-based revalidation alone (`revalidate: 60`) means every page is up to
sixty seconds stale, and every page re-fetches on that schedule whether or not
anything changed. Push-only invalidation alone means a missed webhook leaves a
page stale indefinitely, with nothing to correct it.

There is also a subtler constraint that shaped the routing: **once a response
starts streaming, its status code is already on the wire.** A segment-level
`loading.tsx` wraps every route below it in Suspense, so `notFound()` on
`/articles/[slug]` produced HTTP 200 with 404 content — invisible in a browser,
wrong for crawlers and for any cache keyed on status.

## Decision

Both mechanisms, layered:

- **Time-based floor.** Content queries set `revalidate: 60` and carry tags:
  `articles:list`, `articles:slug:<alias>`, `articles:id:<uuid>`,
  `articles:slugs`. This is the safety net — a missed webhook costs a minute,
  not forever.
- **Push for immediacy.** `POST /api/revalidate` accepts a shared secret and a
  tag list and calls `revalidateTag()`. Drupal fires it on publish, so the
  common case is seconds, not a minute.
- **Draft reads bypass both.** When `draftMode()` is on, queries switch to
  `resourceVersion=rel:working-copy` and `revalidate: 0` — an editor must never
  be served a cached copy of the thing they are editing.
- **Streaming is opted into per page**, via an explicit `<Suspense>` inside the
  article list, rather than a segment-level `loading.tsx`. The list streams,
  which is where it helps; the detail route awaits and can return a real 404.

## Consequences

**Good.** Publishes appear within seconds; a dropped webhook self-heals within
a minute. Tags are granular, so editing one article does not evict the whole
site. `notFound()` returns a real 404.

**Cost.** Two mechanisms to understand instead of one, and the tag vocabulary
must stay in sync between the query layer and whatever Drupal sends — which is
why every tag is constructed in `lib/drupal/queries.ts` and nowhere else. Losing
a `loading.tsx` means a slow navigation shows the previous page slightly longer
rather than an instant skeleton; the article list keeps its skeleton via the
in-page boundary.

## On the static export

None of this survives `output: export`, which is why the GitHub Pages demo is
Storybook rather than the app. Verified, not assumed: the export fails on the
API route handlers, and with those removed fails again with *"Server Actions
are not supported with static export."* The full app deploys to a Node runtime.

## Alternatives considered

**`revalidate: 60` only.** Simplest, one concept. Rejected: a content site that
takes a minute to reflect a publish is a support conversation on day one.

**Webhook only, `revalidate: false`.** Most efficient when it works. Rejected:
it has no recovery path — one failed delivery and the page is wrong until
someone notices.

**`revalidatePath()` instead of tags.** Simpler to fire, but paths and data
dependencies diverge as soon as one article appears on more than one page.
