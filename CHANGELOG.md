# Changelog

All notable changes to this project will be documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial repository structure, docs, and DDEV scaffolding.
- Drupal 11 backend (`composer.json`) with `jsonapi_extras`, `simple_oauth`,
  `graphql_compose`, `decoupled_router`, `subrequests`.
- `headless_starter` recipe — enables modules, imports config, creates the
  Article content type with body + hero image.
- JSON:API resource overrides (rename `field_body` → `body`, expose `path.alias`
  as `slug`).
- `scripts/install.sh` — one-shot bootstrap: site install, recipe apply, OAuth
  consumer creation, print credentials.
- Next.js 15 (App Router) frontend with strict TypeScript, Tailwind v4, ESLint
  flat config.
- Typed Drupal client (`src/lib/drupal/`) — JSON:API wrapper, Zod-validated
  responses, helper queries for articles.
- OAuth2 client_credentials flow with in-memory token caching.
- Preview mode route (`/api/preview`) — validates `DRUPAL_PREVIEW_SECRET`,
  enables `draftMode()`, redirects to the article path.
- CI workflows — `ci-drupal.yml` (composer validate + PHPStan + PHPCS) and
  `ci-frontend.yml` (typecheck + lint + build).

[Unreleased]: https://github.com/example/drupal-headless-starter
