# Changelog

All notable changes to this project will be documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-09-02

First release the README can be believed about: every claim below is covered by
a test, a screenshot or a live URL.

### Added
- **Contact form** — react-hook-form + zod, one schema shared by the client
  resolver and the Server Action, which re-validates because the client is not
  a trust boundary. A honeypot answers 200 and writes nothing.
- **Drupal validation errors mapped onto form fields** — a JSON:API 422 is
  translated through an explicit field map, so an error on a field the form does
  not expose becomes a form-level message rather than a phantom input.
- **JSON:API mapper layer** (`lib/drupal/mappers/`) — pure functions, importable
  from tests and Storybook. Nothing above it sees `attributes`, `relationships`
  or `included`.
- **Error boundaries** — route, root-layout and article-level, all rendering one
  `ErrorState` that never prints `error.message` (only Next's `digest`).
- **Streaming article list** behind an explicit `<Suspense>`, with skeletons
  that mirror card geometry and are hidden from assistive technology.
- **Dark mode** — palette declared once as tokens, following
  `prefers-color-scheme` with an explicit `data-theme` override.
- **Storybook** — 19 stories covering states unreachable in a running app
  (draft banner, Drupal 422, markup the sanitiser strips), published to GitHub
  Pages.
- **Testing** — 117 unit/component tests (Vitest + Testing Library, with
  `axe-core` failing CI on serious/critical a11y violations) and 13 Playwright
  specs against a production build talking to a mock Drupal over real HTTP.
- **CI split into named jobs** — Quality, Tests, Build, E2E — plus Prettier.
- **Three ADRs** covering domain-model mapping, caching, and testing strategy.
- **Screenshots** generated from the running app (`scripts/screenshots.mjs`).

### Fixed
- **Article detail pages never resolved against a live backend.** The page
  passed the full alias into a query that prefixes `/articles/` itself, so every
  lookup requested `/articles/articles/<slug>`. Found by the E2E suite on its
  first run.
- **`notFound()` answered HTTP 200.** A segment-level `loading.tsx` starts
  streaming before the status is decided, so a missing article returned 200 with
  404 content — wrong for crawlers and caches.
- **`next build` failed without a backend** whenever an unrelated server
  occupied the configured port: the 404 arrived as an `OAuthError` rather than a
  `TypeError`, which the degradation path did not recognise.
- **Header, footer and card borders were hard-coded light**, so they did not
  follow dark mode.

### Changed
- TypeScript tightened with `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`.
- Node floor raised to 22 (CI runs 24); Node 20 is end-of-life and jsdom 30's
  undici dependency does not run on it.
- `DrupalApiError` now carries the raw response body — the truncated message was
  discarding the error document that drives per-field form errors.

### Notes
- The GitHub Pages demo is Storybook, not a static export of the app. Verified,
  not assumed: `output: export` fails on the API route handlers, and with those
  removed fails again with "Server Actions are not supported with static
  export". The full app deploys to a Node runtime — one-click Vercel button in
  the README.

## [0.1.0] - 2026-06-22

### Added
- Initial repository structure, docs, and DDEV scaffolding.
- Drupal 11 backend (`composer.json`) with `jsonapi_extras`, `simple_oauth`,
  `graphql_compose`, `decoupled_router`, `subrequests`.
- `headless_starter` recipe — enables modules and creates the Article content
  type with body + hero image. The recipe ships its own configuration under
  `recipes/headless_starter/config/`, which Drupal imports automatically.
- JSON:API resource overrides (rename `field_body` → `body`, expose `path.alias`
  as `slug`).
- `scripts/install.sh` — one-shot bootstrap: site install, recipe apply, OAuth
  consumer creation, print credentials.
- Next.js 15 (App Router) frontend with strict TypeScript, Tailwind v4, ESLint
  flat config, and a committed `pnpm-lock.yaml`.
- Typed Drupal client (`src/lib/drupal/`) — JSON:API wrapper, Zod-validated
  responses, helper queries for articles. Article lookups filter on
  `path.alias`, and build-time data collection tolerates an unreachable backend
  (ISR backfills once Drupal is reachable).
- OAuth2 client_credentials flow with in-memory token caching.
- Preview mode routes (`/api/preview` and `/api/preview/exit`) — validate
  `DRUPAL_PREVIEW_SECRET`, toggle `draftMode()`, redirect to the article path.
- CI workflows — `ci-drupal.yml` (composer validate + PHPStan + PHPCS) and
  `ci-frontend.yml` (typecheck + lint + build).

[Unreleased]: https://github.com/mykolapodpriatov/drupal-headless-starter/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/mykolapodpriatov/drupal-headless-starter/releases/tag/v0.1.0
