#!/usr/bin/env node
//
// A stand-in Drupal backend for the E2E suite.
//
// Why a real HTTP server rather than intercepting fetch (MSW): the Next server
// under test runs in its own process, so an in-process interceptor would need a
// loader hook wired into `next start` — more machinery, and it would stub out
// exactly the layer these tests exist to exercise. A socket that speaks JSON:API
// keeps the OAuth handshake, the query-string builder, the 401 retry and the zod
// response validation all in the path.

import { createServer } from 'node:http';

import { draftArticle, files, publishedArticles } from './fixtures.mjs';

const PORT = Number(process.env.MOCK_DRUPAL_PORT ?? 4001);

/** Email the mock always rejects, so the 422 path can be exercised. */
const REJECTED_EMAIL = 'taken@example.com';

function send(res, status, body, contentType = 'application/vnd.api+json') {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'content-type': contentType,
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function collection(data) {
  return { data, included: files, meta: { count: data.length }, links: {} };
}

function handleArticles(url) {
  const isDraft = url.searchParams.get('resourceVersion') === 'rel:working-copy';
  const alias = url.searchParams.get('filter[path.alias]');
  const pool = isDraft ? [...publishedArticles, draftArticle] : publishedArticles;

  if (alias) {
    const match = pool.find((a) => a.attributes.slug === alias);
    return collection(match ? [match] : []);
  }

  const limit = Number(url.searchParams.get('page[limit]') ?? pool.length);
  return collection(pool.slice(0, limit));
}

// Two errors on purpose: one on a field the form owns, one on a field it does
// not. The second must surface as a form-level message, never as an invented
// input — see lib/drupal/errors.ts.
function contactErrors(email) {
  return {
    errors: [
      {
        title: 'Unprocessable Entity',
        status: '422',
        detail: 'field_email.0.value: This address is already subscribed.',
        source: { pointer: '/data/attributes/field_email' },
      },
      {
        title: 'Unprocessable Entity',
        status: '422',
        detail: `field_internal_note: rejected for ${email}.`,
        source: { pointer: '/data/attributes/field_internal_note' },
      },
    ],
  };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  if (req.method === 'POST' && url.pathname === '/oauth/token') {
    await readBody(req);
    return send(
      res,
      200,
      { access_token: 'mock-token', token_type: 'Bearer', expires_in: 3600 },
      'application/json',
    );
  }

  if (req.method === 'POST' && url.pathname === '/jsonapi/node/contact_message') {
    const raw = await readBody(req);
    let email = '';
    try {
      email = JSON.parse(raw)?.data?.attributes?.field_email ?? '';
    } catch {
      /* unparseable body — fall through to the generic accept */
    }
    if (email === REJECTED_EMAIL) return send(res, 422, contactErrors(email));
    return send(res, 201, { data: { id: '66666666-6666-4666-8666-666666666666' } });
  }

  // Serve the actual image bytes too — next/image proxies the file through the
  // optimizer, and a 404 there fills the server log with upstream errors that
  // look like real failures during a test run.
  if (req.method === 'GET' && url.pathname === '/sites/default/files/hero.jpg') {
    // Smallest valid JPEG that decodes: a 1x1 grey pixel.
    const jpeg = Buffer.from(
      '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
        'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
        'AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
      'base64',
    );
    res.writeHead(200, {
      'content-type': 'image/jpeg',
      'content-length': jpeg.length,
      'cache-control': 'public, max-age=3600',
    });
    return res.end(jpeg);
  }

  if (req.method === 'GET' && url.pathname === '/jsonapi/articles') {
    return send(res, 200, handleArticles(url));
  }

  return send(res, 404, { errors: [{ title: 'Not Found', status: '404' }] });
});

server.listen(PORT, () => {
  process.stdout.write(`mock-drupal listening on http://localhost:${PORT}\n`);
});
