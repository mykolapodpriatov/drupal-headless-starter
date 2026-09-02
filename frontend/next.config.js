// @ts-check

/**
 * Next.js 15 config.
 *
 * - Reads the Drupal base URL from env so deployments can repoint at staging
 *   without a code change.
 * - Pre-authorises Drupal image hosts for next/image's <Image>.
 * - Exposes the public URL for client components that need to build links
 *   back into Drupal (preview, JSON:API debug, etc.).
 */

const publicDrupalUrl =
  process.env.NEXT_PUBLIC_DRUPAL_BASE_URL || 'http://localhost';

/** @type {URL} */
const drupalUrl = new URL(publicDrupalUrl);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Server Actions are on by default in 15.x; keep this section as the
    // single source of opt-in for future flags.
  },
  images: {
    remotePatterns: [
      {
        protocol: /** @type {'http' | 'https'} */ (
          drupalUrl.protocol.replace(':', '')
        ),
        hostname: drupalUrl.hostname,
        port: drupalUrl.port || '',
        pathname: '/sites/default/files/**',
      },
    ],
  },
  // Forward an X-Frame-Options header so Drupal can't iframe us back —
  // matters for preview, where we sit inside an iframe in the editor.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
