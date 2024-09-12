# Architecture

## Why decoupled?

Drupal's editorial UX is excellent. Its front-end render layer, when pushed past
a basic theme, is a tax on Time-to-First-Byte and a constant friction point
when you want a real component-driven UI. Splitting them lets each side do
what it's good at.

The cost is integration surface — auth, preview, cache invalidation. This repo
exists to make those cheap.

## Component map

```
                ┌───────────────────────────┐
                │  Editorial: Drupal admin  │
                └────────────┬──────────────┘
                             │
                             ▼
        ┌──────────────────────────────────────────┐
        │ Drupal 11                                │
        │                                          │
        │   ┌────────────────────────────────────┐ │
        │   │ Content types (Article, ...)       │ │
        │   │ Media library (images, files)      │ │
        │   └───────────────┬────────────────────┘ │
        │                   │                      │
        │   ┌───────────────▼────────────────────┐ │
        │   │ jsonapi_extras (resource shaping)  │ │
        │   │ graphql_compose (read-only schema) │ │
        │   │ decoupled_router (path → entity)   │ │
        │   │ simple_oauth (OAuth2 server)       │ │
        │   └───────────────┬────────────────────┘ │
        └───────────────────┼──────────────────────┘
                            │ HTTP (Bearer JWT)
                            ▼
   ┌──────────────────────────────────────────────────────┐
   │ Next.js 15 (App Router)                              │
   │                                                      │
   │  app/                                                │
   │   ├── page.tsx              ← RSC, home              │
   │   ├── articles/page.tsx     ← list, revalidate=60    │
   │   ├── articles/[slug]/...   ← detail + draftMode     │
   │   ├── api/preview/route.ts  ← preview handshake      │
   │   └── api/auth/callback     ← OAuth2 PKCE callback   │
   │                                                      │
   │  lib/                                                │
   │   ├── drupal/client.ts      ← fetch + JSON:API parse │
   │   ├── drupal/queries.ts     ← getArticles, ...       │
   │   ├── drupal/types.ts       ← TS interfaces          │
   │   └── oauth/token.ts        ← client_credentials     │
   └──────────────────────────────────────────────────────┘
```

## Data flow — published content

1. RSC calls `getArticles()` from `src/lib/drupal/queries.ts`.
2. The query is dispatched through `drupalFetch()` which:
   - acquires a cached bearer token via `getClientCredentialsToken()`
   - issues `GET /jsonapi/node/article?include=field_image.field_media_image&fields[...]=...`
   - validates the response against a Zod schema before returning typed data
3. The page is rendered statically (or via ISR with `revalidate: 60`).

## Data flow — preview

1. Editor clicks "Preview" inside Drupal.
2. Drupal redirects to `https://frontend/api/preview?secret=...&slug=/articles/foo`.
3. Next.js validates `secret`, calls `draftMode().enable()`, redirects to `/articles/foo`.
4. The article page reads `draftMode().isEnabled` and switches the JSON:API
   query to include unpublished revisions (`?resourceVersion=rel:working-copy`).

## Caching strategy

- **Static** for marketing/home and any page that doesn't change per request.
- **ISR (revalidate: 60)** for article list and detail pages — content edits
  surface within a minute without a redeploy.
- **`revalidatePath` / `revalidateTag`** hooks fired by a Drupal `entity_update`
  hook for instant invalidation (optional; see `docs/deploy.md`).

## Why both JSON:API and GraphQL?

JSON:API is the default — zero configuration, every entity is automatically
exposed, and `jsonapi_extras` lets editors hide internal field names. It's the
right call for 90% of fetches.

GraphQL Compose is there for over-fetch-sensitive views — a paginated listing
that needs three fields out of fifteen. The schema is auto-generated from
Drupal config, so it stays in sync with the model.

## Trade-offs

- **No SSR auth for end users.** OAuth in this template is server-to-server
  and editor-only. A real consumer app should layer NextAuth.js or
  Auth.js on top.
- **GraphQL Compose is read-only.** Mutations still go through JSON:API.
- **Translations are out of scope.** The article type is single-language;
  enabling `content_translation` + Drupal's language negotiation is left as
  an exercise.
