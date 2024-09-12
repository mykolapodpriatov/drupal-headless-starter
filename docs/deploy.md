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
   - `NEXT_PUBLIC_FRONTEND_URL`
5. Add `*.drupal.example.com` to `next.config.js` `images.remotePatterns`.

### Netlify

Same env vars. `@netlify/plugin-nextjs` handles ISR + on-demand revalidation.

## Cache invalidation

Two options:

1. **Time-based** — `revalidate: 60` on every page. Simple, "good enough" for
   content sites with edits per hour.
2. **On-demand** — Drupal sends a webhook to
   `POST /api/revalidate?tag=node:{uuid}` on `entity_update` / `entity_delete`.
   Next.js calls `revalidateTag(tag)`. Pair with `fetch(url, { next: { tags: [...] } })`
   in the queries. This starter doesn't ship the route, but the JSON:API client
   already tags fetches — flipping it on is a 10-line route handler.

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
