# frontend/

Next.js 15 App Router consumer for the Drupal backend.

## Scripts

```bash
pnpm dev          # next dev (port 3000)
pnpm build        # production build
pnpm start        # serve a production build locally
pnpm lint         # eslint (flat config)
pnpm typecheck    # tsc --noEmit
```

## Env

Copy `.env.local.example` to `.env.local` and fill in the OAuth client_id and
client_secret printed by `drupal/scripts/install.sh`.

## Folder layout

```
src/
├── app/                          # App Router
│   ├── layout.tsx
│   ├── page.tsx                  # home
│   ├── articles/
│   │   ├── page.tsx              # list
│   │   └── [slug]/page.tsx       # detail
│   ├── api/
│   │   ├── preview/route.ts      # preview handshake
│   │   └── auth/callback/        # OAuth2 PKCE callback
│   └── not-found.tsx
├── lib/
│   ├── drupal/
│   │   ├── client.ts             # typed fetch wrapper
│   │   ├── queries.ts            # getArticles, getArticleBySlug, ...
│   │   └── types.ts              # ArticleNode, MediaImage, User
│   └── oauth/
│       └── token.ts              # client_credentials with in-memory cache
├── components/
│   ├── Article.tsx
│   └── ArticleCard.tsx
└── styles/
    └── globals.css
```
