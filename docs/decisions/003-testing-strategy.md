# ADR 003 — Testing strategy: three layers, no live Drupal in CI

**Status:** accepted · **Date:** 2026-09-02

## Context

The interesting failures in a decoupled stack are *integration* failures — the
frontend and the backend each behave correctly and still do not fit together.
Two shipped bugs in this repo make the point, both found by the E2E suite the
day it was added and neither catchable by a unit test:

1. The article page passed `/articles/${slug}` into a query that prefixes
   `/articles/` itself, so every detail page requested
   `/articles/articles/<slug>`. Both functions were individually correct; the
   mistake lived in the seam between them.
2. `notFound()` answered HTTP 200, because a segment-level `loading.tsx` had
   already started streaming the response.

At the same time, standing up a real Drupal in CI to catch such things means
Composer installs, a database, and a fixture content model — minutes of runtime
and a new class of flake.

## Decision

Three layers, each with a job the others cannot do.

**Unit (Vitest, node).** Pure logic: the JSON:API query builder, the mappers,
the Drupal error translator, OAuth PKCE and token handling, the HTML sanitiser,
env validation. Fast, no DOM, no network.

**Component (Vitest, jsdom + Testing Library).** Components against domain-model
fixtures, queried by role and label rather than by class name. `axe-core` runs
over each rendered component and **fails on serious or critical violations**, so
accessibility regressions break CI instead of waiting for someone to open the
Storybook a11y panel. `color-contrast` is disabled there: jsdom has no layout to
measure, so the rule reports nothing useful — contrast stays a visual check.

**End-to-end (Playwright).** A production build (`next build && next start`) —
not `next dev`, which papers over hydration and caching differences — talking to
a ~120-line HTTP server that speaks JSON:API.

## Why a real HTTP mock and not MSW

The Next server under test runs in its own process, so an in-process fetch
interceptor needs a loader hook wired into `next start`: more machinery, and it
stubs out exactly the layer these tests exist to exercise. A socket keeps the
OAuth handshake, the query-string builder, the 401 retry and the zod response
validation all in the path. The mock also serves the image bytes, so
`next/image` is exercised end to end.

The mock doubles as a fixture authority: it is the same data Storybook and the
unit tests use, so a demo can never show a shape the app could not produce.

## Consequences

**Good.** CI runs in about two minutes with no database. The E2E suite exercises
the real client, real caching and real routing. The mock is small enough to read
in one sitting.

**Cost.** The mock can drift from real Drupal — it encodes *our belief* about
JSON:API, and a Drupal upgrade that changes response shapes would not be caught
here. That is an accepted trade: zod validates every real response at runtime
and throws loudly on drift, which turns a silent mismatch into a visible error.

## What is deliberately not covered

**Pixel-diff visual regression.** Baselines captured on macOS do not match a
Linux runner — font rendering and antialiasing differ — so the check would be
red from day one, and a permanently red check trains people to ignore CI. It is
tracked in the roadmap, to be done inside the CI container.

**A real Drupal integration run.** Worth adding as a nightly job against a DDEV
instance; it does not belong on the PR path.
