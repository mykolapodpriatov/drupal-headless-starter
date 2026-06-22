#!/usr/bin/env bash
#
# Bootstrap the headless Drupal site from a clean checkout:
#
#   1. Install Drupal (standard profile, throwaway admin/admin).
#   2. Generate the simple_oauth keypair if missing.
#   3. Apply the headless_starter recipe.
#   4. Create the Next.js OAuth consumer + print client_id / client_secret.
#
# Idempotent — safe to re-run; the recipe and consumer step short-circuit if
# the site is already configured. Designed to be invoked from `ddev exec`:
#
#   ddev exec drupal/scripts/install.sh
#
# or from your CI bootstrap.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/web"
KEYS="$ROOT/keys"
RECIPE="$ROOT/recipes/headless_starter"

# ---------------------------------------------------------------------------
# Drush helper — picks up the local vendor bin.
# ---------------------------------------------------------------------------
DRUSH="$ROOT/vendor/bin/drush"
if [ ! -x "$DRUSH" ]; then
  echo "drush not found at $DRUSH — run 'composer install' inside drupal/ first." >&2
  exit 1
fi

cd "$WEB"

# ---------------------------------------------------------------------------
# 1. Site install (only if not already installed).
# ---------------------------------------------------------------------------
if ! "$DRUSH" status --field=bootstrap 2>/dev/null | grep -q Successful; then
  echo "==> Installing Drupal (standard, admin/admin)..."
  "$DRUSH" site:install standard \
    --account-name=admin \
    --account-pass=admin \
    --account-mail=admin@example.com \
    --site-name="Drupal Headless Starter" \
    --site-mail=admin@example.com \
    --yes
else
  echo "==> Drupal already installed, skipping site:install."
fi

# ---------------------------------------------------------------------------
# 2. OAuth keypair.
# ---------------------------------------------------------------------------
mkdir -p "$KEYS"
if [ ! -f "$KEYS/private.key" ]; then
  echo "==> Generating simple_oauth keypair in $KEYS"
  openssl genrsa -out "$KEYS/private.key" 2048
  openssl rsa -in "$KEYS/private.key" -pubout -out "$KEYS/public.key"
  chmod 600 "$KEYS/private.key"
  chmod 644 "$KEYS/public.key"
else
  echo "==> OAuth keypair present, skipping."
fi

# ---------------------------------------------------------------------------
# 3. Recipe — enables modules and imports the recipe's own config.
# ---------------------------------------------------------------------------
# The recipe enables every module in its `install:` list and then creates the
# config shipped under recipes/headless_starter/config/ (Article type + fields,
# editor/frontend_consumer roles, simple_oauth + jsonapi_extras settings).
echo "==> Applying recipe: headless_starter"
php "$WEB/core/scripts/drupal" recipe "$RECIPE"

"$DRUSH" cache:rebuild

# ---------------------------------------------------------------------------
# 4. Next.js OAuth consumer.
# ---------------------------------------------------------------------------
CLIENT_LABEL="Next.js frontend"
EXISTING_UUID="$("$DRUSH" sqlq "SELECT uuid FROM consumers_field_data WHERE label='${CLIENT_LABEL}' LIMIT 1" 2>/dev/null || true)"

if [ -z "$EXISTING_UUID" ]; then
  echo "==> Creating OAuth consumer '${CLIENT_LABEL}'..."
  CLIENT_SECRET="$(openssl rand -hex 24)"
  CLIENT_UUID="$("$DRUSH" php:eval "
    \$consumer = \Drupal\consumers\Entity\Consumer::create([
      'label' => '${CLIENT_LABEL}',
      'client_id' => 'nextjs-frontend',
      'secret' => '${CLIENT_SECRET}',
      'confidential' => TRUE,
      'third_party' => FALSE,
      'is_default' => FALSE,
      'roles' => [['target_id' => 'frontend_consumer']],
      'grant_types' => ['client_credentials', 'authorization_code', 'refresh_token'],
      'redirect' => ['" "${NEXT_PUBLIC_FRONTEND_URL:-http://localhost:3000}/api/auth/callback" "'],
      'pkce' => TRUE,
    ]);
    \$consumer->save();
    print \$consumer->uuid();
  ")"
  echo
  echo "    Consumer UUID:    $CLIENT_UUID"
  echo "    Client ID:        nextjs-frontend"
  echo "    Client secret:    $CLIENT_SECRET"
  echo
  echo "    Copy these into frontend/.env.local:"
  echo
  echo "      DRUPAL_CLIENT_ID=nextjs-frontend"
  echo "      DRUPAL_CLIENT_SECRET=$CLIENT_SECRET"
  echo
else
  echo "==> Consumer '${CLIENT_LABEL}' already present (uuid=$EXISTING_UUID), skipping."
fi

echo "==> Done. Drupal is at $("$DRUSH" status --field=uri)"
