<?php

/**
 * @file
 * Drupal site-specific configuration.
 *
 * Designed for a containerised / 12-factor deployment: everything that varies
 * by environment comes from $_ENV / getenv(). Drop a settings.local.php next
 * to this file for developer-only overrides; it's gitignored.
 */

declare(strict_types=1);

// -----------------------------------------------------------------------------
// Database — pulled from environment.
// -----------------------------------------------------------------------------
$databases['default']['default'] = [
  'database' => getenv('MYSQL_DATABASE') ?: 'db',
  'username' => getenv('MYSQL_USER') ?: 'db',
  'password' => getenv('MYSQL_PASSWORD') ?: 'db',
  'host'     => getenv('MYSQL_HOST') ?: 'db',
  'port'     => getenv('MYSQL_PORT') ?: '3306',
  'driver'   => 'mysql',
  'prefix'   => '',
  'collation' => 'utf8mb4_general_ci',
  'namespace' => 'Drupal\\mysql\\Driver\\Database\\mysql',
  'autoload'  => 'core/modules/mysql/src/Driver/Database/mysql/',
];

// -----------------------------------------------------------------------------
// Hash salt — required, must be the same across every web node.
// -----------------------------------------------------------------------------
$settings['hash_salt'] = getenv('HASH_SALT') ?: 'replace-me-with-50-random-chars';

// -----------------------------------------------------------------------------
// Trusted host patterns. Adjust per environment.
// -----------------------------------------------------------------------------
$settings['trusted_host_patterns'] = [
  '^drupal-headless-starter\.ddev\.site$',
  '^api\.drupal-headless-starter\.ddev\.site$',
];
if ($extra = getenv('TRUSTED_HOST_PATTERNS')) {
  foreach (explode(',', $extra) as $pattern) {
    $settings['trusted_host_patterns'][] = trim($pattern);
  }
}

// -----------------------------------------------------------------------------
// File paths.
// -----------------------------------------------------------------------------
$settings['file_public_path']   = 'sites/default/files';
$settings['file_private_path']  = getenv('DRUPAL_PRIVATE_FILES') ?: '../private';
$settings['file_temp_path']     = '/tmp';
$settings['config_sync_directory'] = __DIR__ . '/../../../config/sync';

// -----------------------------------------------------------------------------
// simple_oauth keys — read from env so the keys can live on a mounted secret.
// -----------------------------------------------------------------------------
$config['simple_oauth.settings']['public_key']  = getenv('DRUPAL_OAUTH_PUBLIC_KEY_PATH')  ?: '../keys/public.key';
$config['simple_oauth.settings']['private_key'] = getenv('DRUPAL_OAUTH_PRIVATE_KEY_PATH') ?: '../keys/private.key';

// -----------------------------------------------------------------------------
// Frontend / preview wiring (used by a tiny custom module that emits the
// preview URL into the node form). Documented in docs/preview-mode.md.
// -----------------------------------------------------------------------------
$config['headless_starter.settings']['frontend_url']    = getenv('NEXT_PUBLIC_FRONTEND_URL') ?: 'http://localhost:3000';
$config['headless_starter.settings']['preview_secret']  = getenv('DRUPAL_PREVIEW_SECRET') ?: 'dev-preview-secret-change-me';

// -----------------------------------------------------------------------------
// Performance — disable on dev via settings.local.php.
// -----------------------------------------------------------------------------
$config['system.performance']['css']['preprocess'] = TRUE;
$config['system.performance']['js']['preprocess']  = TRUE;

$settings['container_yamls'][] = __DIR__ . '/services.yml';

// Local overrides last — they win.
if (file_exists(__DIR__ . '/settings.local.php')) {
  // @codingStandardsIgnoreLine
  include __DIR__ . '/settings.local.php';
}
