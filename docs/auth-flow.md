# Auth flow

Two distinct OAuth2 flows live in this starter. Pick the right one for the
right consumer.

## 1. Client Credentials (server-to-server)

Used by Next.js RSC and ISR builds. There's no user — it's the frontend
authenticating *as itself* to read content the public role can't see (eg.
unpublished previews via the editor consumer).

```
Next.js server                          Drupal /oauth/token
      │                                          │
      │  POST grant_type=client_credentials      │
      │  client_id + client_secret               │
      ├─────────────────────────────────────────▶│
      │                                          │
      │       access_token (JWT, ~1h)            │
      │◀─────────────────────────────────────────┤
      │                                          │
      │  GET /jsonapi/node/article               │
      │  Authorization: Bearer <jwt>             │
      ├─────────────────────────────────────────▶│
      │                                          │
      │              200 OK                      │
      │◀─────────────────────────────────────────┤
```

Token caching lives in `src/lib/oauth/token.ts`. It's a process-local cache
keyed by client_id with a 60-second safety window before expiry. On Vercel,
each lambda instance maintains its own cache — that's fine, the cost is one
extra `/oauth/token` call per cold start.

## 2. Authorization Code + PKCE (editor preview)

Used when an editor inside Drupal admin clicks through to the Next.js preview
of an article they're editing. We need *their* identity, not the consumer's.

```
Editor browser    Drupal /oauth/authorize           Next.js /api/auth/callback
      │                  │                                      │
      │  click "Preview" │                                      │
      ├─────────────────▶│                                      │
      │                  │                                      │
      │  302 to authorize w/ code_challenge=S256(verifier)     │
      │◀─────────────────┤                                      │
      │                                                         │
      │  /oauth/authorize?response_type=code&...                │
      ├────────────────▶ │                                      │
      │                  │                                      │
      │  302 to /api/auth/callback?code=...&state=...           │
      │◀─────────────────┤                                      │
      │                                                         │
      │  GET /api/auth/callback?code=...&state=...              │
      ├────────────────────────────────────────────────────────▶│
      │                                                         │
      │            (Next.js exchanges code+verifier for         │
      │             access_token, sets a session cookie,        │
      │             redirects to /articles/[slug])              │
      │◀────────────────────────────────────────────────────────┤
```

The PKCE verifier and `state` are stored in a short-lived cookie set on the
outbound redirect. `code_challenge_method=S256` is required.

## Consumer setup

`simple_oauth` exposes "Consumers" as a Drupal entity type. The
`scripts/install.sh` creates one for Next.js:

- **Label**: `Next.js frontend`
- **Client ID**: `nextjs-frontend` (the client secret is printed to stdout)
- **Client Secret**: required for client_credentials, optional for PKCE
- **Confidential**: yes (kept server-side)
- **Roles**: `frontend_consumer` (read access to published + draft content)

## Token introspection

Bearer JWTs issued by `simple_oauth` are signed with the keypair in
`drupal/keys/`. Public key is exposed at `/oauth/discovery/keys` (JWKS).
Frontend doesn't currently verify the JWT — it just hands it back to Drupal —
but the JWKS endpoint is there for any consumer that wants to.

## Key rotation

1. Generate a new keypair: `openssl genrsa -out keys/private-new.key 2048 && openssl rsa -in keys/private-new.key -pubout -out keys/public-new.key`.
2. Update `simple_oauth.settings.yml` `public_key` / `private_key` paths.
3. Re-apply the recipe (or `drush config:set` the new key paths), then `drush cr`.
4. Old tokens become invalid the moment the old keys leave the filesystem.

For zero-downtime rotation you'd want a JWKS with multiple keys — out of scope
for this starter.
