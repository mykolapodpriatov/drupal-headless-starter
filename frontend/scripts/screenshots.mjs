#!/usr/bin/env node
//
// Regenerates the README screenshots from the running application.
//
// Run against the same mock backend the E2E suite uses, so the images always
// show data the app can actually produce:
//
//   node e2e/mock-drupal/server.mjs &
//   pnpm build && pnpm start -p 3100          (with the E2E env vars)
//   node scripts/screenshots.mjs
//
// Images land in ../docs/images and are committed — a README without a picture
// is a README nobody reads.

import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../../docs/images');
const BASE = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:3100';

const SHOTS = [
  { name: 'articles-list', path: '/articles', theme: 'light' },
  {
    name: 'article-detail',
    path: '/articles/decoupling-drupal',
    theme: 'light',
  },
  {
    name: 'article-detail-dark',
    path: '/articles/decoupling-drupal',
    theme: 'dark',
  },
  { name: 'contact-form', path: '/contact', theme: 'light' },
];

async function run() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();

  for (const shot of SHOTS) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 2,
      colorScheme: shot.theme === 'dark' ? 'dark' : 'light',
    });
    const page = await context.newPage();
    await page.goto(`${BASE}${shot.path}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${OUT}/${shot.name}.png` });
    await context.close();
    process.stdout.write(`✓ ${shot.name}.png\n`);
  }

  // The form's validation state is the interesting picture, not the empty form.
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/contact`, { waitUntil: 'networkidle' });
  await page.getByLabel('Name').fill('Ada Lovelace');
  await page.getByLabel('Email').fill('taken@example.com');
  await page.getByLabel('Subject').fill('About the analytical engine');
  await page
    .getByLabel('Message')
    .fill('Notes on the Bernoulli numbers routine.');
  await page.getByRole('button', { name: 'Send message' }).click();
  await page.getByText('This address is already subscribed.').waitFor();
  await page.screenshot({ path: `${OUT}/contact-drupal-error.png` });
  process.stdout.write('✓ contact-drupal-error.png\n');
  await context.close();

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
