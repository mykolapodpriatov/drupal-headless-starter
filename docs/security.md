# Security & hardening checklist

This starter ships production-safe defaults, but a decoupled stack has a wide,
OAuth-heavy, CORS-exposed surface. Walk this checklist before pointing a real
domain at it. Items are ordered by blast radius.

## 1. Keep server-only secrets out of the browser

Two variables must **never** reach the client bundle:

| Variable | Why it is dangerous if leaked |
|---|---|
| `DRUPAL_CLIENT_SECRET` | Mints Client Credentials bearer tokens — full read access at the `frontend_consumer` role, including drafts. |
| `DRUPAL_PREVIEW_SECRET` | Forges the preview handshake, exposing unpublished content (see §5). |

How the boundary is enforced:

- Both are read only through [`frontend/src/lib/env.ts`](../frontend/src/lib/env.ts),
  which starts with `import 'server-only'`. Any component that pulls `env` into a
  client bundle fails the build instead of shipping the secret.
- They are **not** prefixed `NEXT_PUBLIC_`. Only `NEXT_PUBLIC_*` values are
  inlined into client JavaScript by Next.js — keep it that way.
- The OAuth token cache ([`frontend/src/lib/oauth/token.ts`](../frontend/src/lib/oauth/token.ts))
  and the JSON:API client ([`frontend/src/lib/drupal/client.ts`](../frontend/src/lib/drupal/client.ts))
  are both `server-only`; do not import them from a `'use client'` module.

Checklist:

- [ ] Set both secrets in your host's server-side env (Vercel/Netlify project
      secrets), never in `.env.local` committed to git or in `NEXT_PUBLIC_*`.
- [ ] Rotate them on any suspected leak (revoke the consumer in Drupal, issue a
      new secret, redeploy).
- [ ] Grep the built client bundle (`.next/static`) for the secret values before
      a first production deploy.

## 2. Tighten `simple_oauth` scopes and consumer permissions

The frontend authenticates as the `frontend_consumer` role
([`drupal/recipes/headless_starter/config/user.role.frontend_consumer.yml`](../drupal/recipes/headless_starter/config/user.role.frontend_consumer.yml)).
It is intentionally read-only — audit it stays that way:

- [ ] Grant only the permissions the frontend actually reads with. The shipped
      set is `access content`, `access user profiles`,
      `view own unpublished content`, `view all revisions`,
      `view article revisions`, `restful get jsonapi`. Remove any you do not use.
- [ ] Never add write permissions (`create`/`edit`/`delete … content`,
      `administer *`) to the Client Credentials consumer. Draft/revision reads
      are enough for ISR + preview.
- [ ] In [`simple_oauth.settings.yml`](../drupal/recipes/headless_starter/config/simple_oauth.settings.yml)
      keep `access_token_expiration` short (default `3600`s). The in-process
      token cache refreshes automatically 60s before expiry, so a short TTL costs
      nothing and shrinks the window a stolen token is usable.
- [ ] Keep `required_pkce_for_public_clients: true` so the editor
      Authorization-Code flow cannot fall back to an implicit/public grant.
- [ ] Scope the token per app if you run more than one consumer — pass `scope`
      to `getClientCredentialsToken` and define matching `simple_oauth` scopes
      rather than sharing one all-powerful consumer.

## 3. Lock CORS to the frontend origin

[`drupal/web/sites/default/services.yml`](../drupal/web/sites/default/services.yml)
sets `cors.config`. The defaults allow `http://localhost:3000` /
`http://localhost:3001` for local dev — those must not survive to production.

- [ ] Replace `allowedOrigins` with your real `NEXT_PUBLIC_FRONTEND_URL` value
      (e.g. `https://www.example.com`). List explicit origins; never use `*`.
- [ ] Keep `supportsCredentials: false`. The frontend authenticates with a
      bearer token in the `Authorization` header, not cookies, so credentialed
      CORS is unnecessary and pairing `*` origins with credentials is forbidden
      by the spec anyway.
- [ ] Trim `allowedMethods` to what the frontend issues. Pure content delivery
      needs only `GET` (plus `OPTIONS` preflight); drop `POST`/`PATCH`/`DELETE`
      unless a real write path exists.
- [ ] Because `services.yml` is static, render `allowedOrigins` from
      `NEXT_PUBLIC_FRONTEND_URL` in a deploy step, or override via a
      `parameter_bag` service when you need multiple origins — do not hand-edit
      on the server where the next deploy will clobber it.
- [ ] Terminate TLS in front of Drupal and keep `cookie_secure: 'auto'` so the
      OAuth authorize endpoint only sets cookies over HTTPS.

## 4. Rotate the OAuth signing keys in `drupal/keys/`

`simple_oauth` signs access tokens with the RSA keypair referenced by
`public_key` / `private_key`. The keys live in [`drupal/keys/`](../drupal/keys/)
and are gitignored — they must never be committed.

- [ ] Generate a fresh 2048-bit (or larger) keypair per environment:

      ```bash
      openssl genrsa -out private.key 2048
      openssl rsa -in private.key -pubout -out public.key
      chmod 600 private.key
      ```

- [ ] In production, mount the pair as a **read-only secret** and point
      `DRUPAL_OAUTH_PRIVATE_KEY_PATH` / `DRUPAL_OAUTH_PUBLIC_KEY_PATH` at it
      rather than baking keys into the image or repo.
- [ ] Restrict the private key to the web-server user, mode `600`. Anyone who
      can read it can forge valid tokens.
- [ ] Rotate keys on staff offboarding or suspected compromise. Rotating the
      private key immediately invalidates every outstanding access token.
- [ ] Confirm `drupal/keys/*.key` is covered by `.gitignore` (only `.gitkeep`
      should ever be tracked) before your first commit.

## 5. Preview-secret handshake — threat model

Preview mode ([`frontend/src/app/api/preview/route.ts`](../frontend/src/app/api/preview/route.ts),
[`docs/preview-mode.md`](preview-mode.md)) lets an editor jump from Drupal into
the Next.js draft view. Drupal builds a link carrying `secret` + `slug`; the
route validates the secret, enables `draftMode()`, and redirects. Draft mode is
the only thing standing between the public and unpublished content, so the
handshake is a security boundary, not a convenience.

Threats and the mitigations already in the route:

| Threat | Mitigation |
|---|---|
| **Secret guessing / brute force** to read drafts | The secret is compared with `timingSafeEqual` (constant-time), and mismatched lengths still run a constant-time comparison to avoid length leaks. Use a long, random `DRUPAL_PREVIEW_SECRET`. |
| **Open redirect** via a crafted `slug` | `isSafeInternalPath` rejects anything not starting with a single `/` (blocks `//host` and absolute URLs). |
| **Header/response splitting** via CR/LF in `slug` | The same guard rejects any `slug` containing `\r` or `\n`. |
| **Preview enabled on a misconfigured env** | If `DRUPAL_PREVIEW_SECRET` is unset the route returns `500` and refuses to enable draft mode — it fails closed. |

Operational checklist:

- [ ] Use a high-entropy `DRUPAL_PREVIEW_SECRET` (32+ random bytes) and set the
      **same** value on Drupal and the frontend.
- [ ] Rotate it if a preview URL leaks (they are shareable by design — treat a
      leaked link as a leaked secret).
- [ ] Never log full preview URLs; the query string contains the secret.
- [ ] Provide an exit path so stale draft cookies do not linger — see
      [`frontend/src/app/api/preview/exit/route.ts`](../frontend/src/app/api/preview/exit/route.ts).

## 6. General hardening

- [ ] Serve both Drupal and Next.js over HTTPS only; redirect HTTP → HTTPS.
- [ ] Keep `twig.config.debug: false` and
      `http.response.debug_cacheability_headers: false` in production (both are
      already the shipped defaults in `services.yml`).
- [ ] Put Drupal's admin/JSON:API surface behind the same TLS and, where
      possible, restrict `/oauth/token` to the frontend's egress IPs.
- [ ] Keep dependencies patched: `composer audit` for Drupal and
      `pnpm audit` for the frontend in CI.
- [ ] Review this checklist again whenever you add a write path, a new consumer,
      or a second frontend origin.
