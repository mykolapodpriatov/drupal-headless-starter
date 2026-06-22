# Changelog

All notable changes to this project will be documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
