#!/usr/bin/env node
//
// Regenerates the placeholder hero image the mock Drupal backend serves, and
// prints it as a base64 literal to paste into e2e/mock-drupal/server.mjs.
//
// It is inlined rather than committed as a binary so the mock stays a single
// dependency-free file that runs with plain `node`.
//
//   node scripts/make-fixture-image.mjs

import { chromium } from '@playwright/test';

const HTML = `
<style>
  html, body { margin: 0 }
  .hero {
    width: 800px; height: 450px; position: relative; overflow: hidden;
    background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #0ea5e9 100%);
    font-family: Helvetica, Arial, sans-serif;
  }
  .blob { position: absolute; border-radius: 50%; background: rgba(255,255,255,.10) }
  .a { width: 340px; height: 340px; left: -30px; top: 160px }
  .b { width: 240px; height: 240px; left: 530px; top: -10px }
  .label { position: absolute; left: 40px; bottom: 28px; color: rgba(255,255,255,.85); font-size: 22px }
</style>
<div class="hero">
  <div class="blob a"></div><div class="blob b"></div>
  <div class="label">mock media</div>
</div>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
await page.setContent(HTML);
const buffer = await page.screenshot({ type: 'jpeg', quality: 78 });
await browser.close();

const base64 = buffer.toString('base64');
const wrapped = base64
  .match(/.{1,76}/g)
  .map((line) => `        '${line}' +`)
  .join('\n')
  .replace(/ \+$/, '');

process.stdout.write(`${wrapped}\n`);
