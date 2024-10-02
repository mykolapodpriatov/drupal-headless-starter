# drupal/scripts/

Bootstrap helpers, invoked once per environment from a clean checkout.

## install.sh

```bash
# Inside DDEV
ddev exec drupal/scripts/install.sh

# Or directly, assuming drush + a configured DB
cd drupal && ./scripts/install.sh
```

Steps:

1. **`drush site:install standard`** — only if not already installed. Throwaway
   admin/admin credentials; change them in any non-local environment.
2. **OAuth keypair** — generated into `drupal/keys/` if absent. 2048-bit RSA.
3. **Recipe apply** — runs `core/scripts/drupal recipe …/headless_starter`,
   then `drush config:import` to pick up any drift, then `drush cr`.
4. **OAuth consumer** — creates a `consumers` entity labelled
   `Next.js frontend` with `client_credentials + authorization_code + PKCE`
   grant types. Prints the client_id and the generated secret. Copy both into
   `frontend/.env.local`.

The script is idempotent: re-running on a configured site is a no-op apart
from the recipe step (which is itself idempotent — config_import handles
"already there" gracefully).

## What it doesn't do

- Generate content. Use `drush genc 25 --bundles=article` for fixture content.
- Configure mail. Drupal's default mail() is unsuitable for any non-local env.
- Set up TLS. Handled at the host / load balancer level.
