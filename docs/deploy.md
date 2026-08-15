# Deploy

The two halves of this stack deploy independently. That's a feature, not a bug.

## Drupal — production hosts

Any PHP-8.3+ host with composer access works. Common picks:

- **Platform.sh** — `.platform.app.yaml` lives outside this repo, pin PHP 8.3,
  run `drush deploy` in `post_deploy`.
- **Acquia / Pantheon** — both ship Drush + config import out of the box.
- **DIY (DigitalOcean / Hetzner + nginx + php-fpm + MySQL)** — fine for staging,
  put Cloudflare in front.

Required server config:

- `php-fpm` with `opcache.enable=1`, `realpath_cache_size=10M`, `memory_limit=256M`.
- MySQL 8 (or MariaDB 10.11+) with `utf8mb4` default charset.
- Persistent volume for `web/sites/default/files/` and `keys/`.
- `private_files_path` outside the docroot.

### Bootstrap on first deploy

```bash
composer install --no-dev --optimize-autoloader
drush deploy           # config import + entity updates + cache rebuild
drush recipe ../recipes/headless_starter   # idempotent
```

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `MYSQL_HOST`, `MYSQL_DATABASE`, etc. | yes | wired into `settings.php` |
| `HASH_SALT` | yes | 50+ random chars |
| `NEXT_PUBLIC_FRONTEND_URL` | yes | used for CORS + preview redirect |
| `DRUPAL_PREVIEW_SECRET` | yes | must match the Next.js side |
| `DRUPAL_OAUTH_PRIVATE_KEY_PATH` | yes | abs path to RSA private key |
| `DRUPAL_OAUTH_PUBLIC_KEY_PATH` | yes | abs path to RSA public key |

## Next.js — Vercel or Netlify

Both work. Vercel has tighter App Router + ISR integration; Netlify is happier
behind a non-Cloudflare CDN.

### Vercel

1. Import the `frontend/` subdirectory.
2. Build command: `pnpm build` (or `npm run build`).
3. Output: `.next` (default).
4. Env vars (Production scope):
   - `DRUPAL_BASE_URL` — internal URL Drupal is reachable at
   - `NEXT_PUBLIC_DRUPAL_BASE_URL` — public URL (for `<Image>` and previews)
   - `DRUPAL_CLIENT_ID`, `DRUPAL_CLIENT_SECRET`
   - `DRUPAL_PREVIEW_SECRET`
   - `DRUPAL_REVALIDATE_SECRET`
   - `NEXT_PUBLIC_FRONTEND_URL`
5. Add `*.drupal.example.com` to `next.config.js` `images.remotePatterns`.

### Netlify

Same env vars. `@netlify/plugin-nextjs` handles ISR + on-demand revalidation.

## Cache invalidation

Two options, used together:

1. **Time-based** — `revalidate: 60` on article list/detail fetches. Simple,
   "good enough" for content sites with edits per hour, and a fallback if
   the webhook never fires.
2. **On-demand** — `POST /api/revalidate` on the Next.js app. Drupal (or any
   deploy hook) sends a shared secret plus one or more cache tags; the route
   calls `revalidateTag()` for each so the next request refetches immediately.

### Endpoint

```
POST /api/revalidate
```

`secret` and `tag` (or `tags[]`) may live on the query string or in a JSON /
`application/x-www-form-urlencoded` body. Missing or wrong `secret` → `401`.
Missing tag → `400`. Success → `200` with `{ "revalidated": ["…"] }`.

The secret is `DRUPAL_REVALIDATE_SECRET` (same value on the caller and the
Next.js env). Do not put it in `NEXT_PUBLIC_*`.

```bash
# Single tag on the query string
curl -sf -X POST \
  "https://www.example.com/api/revalidate?secret=$DRUPAL_REVALIDATE_SECRET&tag=articles:list"

# Several tags in a JSON body
curl -sf -X POST https://www.example.com/api/revalidate \
  -H 'Content-Type: application/json' \
  -d "{\"secret\":\"$DRUPAL_REVALIDATE_SECRET\",\"tags\":[\"articles:list\",\"articles:id:<uuid>\"]}"
```

### Tag naming convention

Queries in `frontend/src/lib/drupal/queries.ts` already attach these tags to
`fetch()`. Post the matching tag after an edit:

| Tag | What it covers |
|---|---|
| `articles:list` | Article listing (`getArticles`) |
| `articles:slug:/articles/<slug>` | One article by path alias (`getArticleBySlug`) |
| `articles:id:<uuid>` | One article by node UUID (`getArticleById`) |
| `articles:slugs` | `generateStaticParams` slug list (`getArticleSlugs`) |

A typical node save should invalidate the list, the slug list, and that
node's slug + id tags so the listing and the permalink both refresh.

Wiring Drupal's `hook_entity_update` / `hook_entity_delete` to POST here is
left as a follow-up — the webhook is ready to receive it.

## Observability

- Drupal — `monolog` to stdout, scraped by the host's log aggregator.
- Next.js — Vercel Logs / `@vercel/otel` for traces.
- Both sides should report the same `request_id` header on errors. Inject it
  in the frontend's fetch wrapper and log it from Drupal via a service
  subscriber.

## Smoke test post-deploy

```bash
# 1. JSON:API is reachable
curl -sf https://api.example.com/jsonapi | jq .

# 2. OAuth issues tokens
curl -sf -X POST https://api.example.com/oauth/token \
  -d "grant_type=client_credentials&client_id=$ID&client_secret=$SECRET" | jq .

# 3. Frontend can fetch articles
curl -sf https://www.example.com/articles | head

# 4. Preview handshake (replace with valid secret + slug)
curl -sf -i "https://www.example.com/api/preview?secret=...&slug=/articles/x"
```
