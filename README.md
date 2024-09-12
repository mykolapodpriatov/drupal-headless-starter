# Drupal Headless Starter

Production-ready starter for a decoupled Drupal 11 + Next.js 15 stack. Drupal is
the editorial backend exposing both JSON:API and GraphQL; Next.js (App Router)
is the public front-end, with ISR for content pages and a preview mode wired
into Drupal's editorial workflow.

This repo is intentionally opinionated. The goal is to get a working
content-driven SPA on the screen within ten minutes, then peel back the layers.

## Architecture

```
                    ┌─────────────────────────────────────────┐
                    │       Editors / Content workflow        │
                    └────────────────────┬────────────────────┘
                                         │
                                  edit + preview
                                         │
   ┌─────────────────────────────────────▼─────────────────────────────────┐
   │                          Drupal 11 backend                            │
   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
   │  │  JSON:API +  │  │ GraphQL via  │  │ simple_oauth │  │ Recipes + │  │
   │  │ jsonapi_extr.│  │ graphql_comp.│  │  (PKCE/CC)   │  │ config sync│ │
   │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └───────────┘  │
   └─────────┼─────────────────┼─────────────────┼─────────────────────────┘
             │                 │                 │
             ▼                 ▼                 ▼
   ┌────────────────────────────────────────────────────────┐
   │             Next.js 15 frontend (App Router)           │
   │                                                        │
   │  RSC ──▶ src/lib/drupal/client.ts ──▶ JSON:API/GraphQL │
   │  Preview ──▶ /api/preview ──▶ draftMode + redirect     │
   │  Auth ──▶ src/lib/oauth/token.ts (client_credentials)  │
   └────────────────────────────────────────────────────────┘
```

The frontend never talks to Drupal's database directly. Everything goes through
JSON:API (default for content fetching) or GraphQL Compose (for over-fetching-
sensitive views). Auth is OAuth2 — Authorization Code + PKCE for editor preview,
Client Credentials for the server-to-server fetches that power ISR builds.

## Quickstart

Prerequisites: DDEV, Docker, Node 20, pnpm or npm.

```bash
# 1. Boot the full stack (Drupal + Node)
ddev start

# 2. Install Drupal, enable modules, apply the headless_starter recipe,
#    create the Next.js OAuth consumer
ddev exec drupal/scripts/install.sh

# 3. In another terminal, run the Next.js dev server
ddev frontend-dev
```

Drupal is at `https://drupal-headless-starter.ddev.site` (admin / admin).
Next.js is at `http://localhost:3000`.

## Environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `DRUPAL_BASE_URL` | frontend (server) | Internal URL used by RSC fetches |
| `NEXT_PUBLIC_DRUPAL_BASE_URL` | frontend (browser) | Used for image URLs and previews |
| `DRUPAL_CLIENT_ID` | frontend | OAuth consumer ID printed by install.sh |
| `DRUPAL_CLIENT_SECRET` | frontend | OAuth consumer secret |
| `DRUPAL_PREVIEW_SECRET` | both | Shared secret for the preview handshake |
| `NEXT_PUBLIC_FRONTEND_URL` | Drupal | Used for CORS + preview redirects |

## Auth flow

OAuth2 with `simple_oauth`. Two flows are wired:

1. **Client Credentials** — for ISR builds and server-side fetches. The
   frontend caches the bearer token in-process (see `src/lib/oauth/token.ts`).
2. **Authorization Code + PKCE** — for editors stepping from Drupal admin into
   the Next.js preview surface. The callback lives at `/api/auth/callback`.

Detailed sequence diagrams live in [`docs/auth-flow.md`](docs/auth-flow.md).

## Preview mode

An editor saves a draft in Drupal. Drupal builds a one-time preview URL
containing `secret` + the node UUID and redirects the editor to
`/api/preview?secret=...&slug=...` on Next.js. The route validates the secret,
calls `draftMode().enable()`, then redirects to the article path. Server
Components reading `draftMode().isEnabled` switch their JSON:API queries to
include unpublished content. See [`docs/preview-mode.md`](docs/preview-mode.md).

## Deploy

Drupal and Next.js are deployed independently — see
[`docs/deploy.md`](docs/deploy.md). Short version: Drupal on a PHP host
(Platform.sh, Acquia, Pantheon, or your own), Next.js on Vercel/Netlify with
the OAuth env vars set. The frontend never needs filesystem access to the
Drupal install.

## License

MIT — see [`LICENSE`](LICENSE).
