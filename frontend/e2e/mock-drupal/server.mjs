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
  const isDraft =
    url.searchParams.get('resourceVersion') === 'rel:working-copy';
  const alias = url.searchParams.get('filter[path.alias]');
  const pool = isDraft
    ? [...publishedArticles, draftArticle]
    : publishedArticles;

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

  if (
    req.method === 'POST' &&
    url.pathname === '/jsonapi/node/contact_message'
  ) {
    const raw = await readBody(req);
    let email = '';
    try {
      email = JSON.parse(raw)?.data?.attributes?.field_email ?? '';
    } catch {
      /* unparseable body — fall through to the generic accept */
    }
    if (email === REJECTED_EMAIL) return send(res, 422, contactErrors(email));
    return send(res, 201, {
      data: { id: '66666666-6666-4666-8666-666666666666' },
    });
  }

  // Serve the actual image bytes too — next/image proxies the file through the
  // optimizer, and a 404 there fills the server log with upstream errors that
  // look like real failures during a test run.
  if (
    req.method === 'GET' &&
    url.pathname === '/sites/default/files/hero.jpg'
  ) {
    // A 16:9 gradient rather than a 1x1 pixel: the app scales this to fill a
    // hero box, and a single stretched pixel makes screenshots and manual
    // checks look broken when nothing is. Regenerate with
    // scripts/make-fixture-image.mjs.
    const jpeg = Buffer.from(
      '/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdC' +
        'IFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAA' +
        'AADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlk' +
        'ZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAA' +
        'ABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAA' +
        'AAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAA' +
        'AABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEA' +
        'AAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAA' +
        'ACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAcFBQYFBAcGBgYIBwcI' +
        'CxILCwoKCxYPEA0SGhYbGhkWGRgcICgiHB4mHhgZIzAkJiorLS4tGyIyNTEsNSgsLSz/2wBDAQcI' +
        'CAsJCxULCxUsHRkdLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCws' +
        'LCwsLCz/wAARCAHCAyADASIAAhEBAxEB/8QAGwABAQADAQEBAAAAAAAAAAAAAAECAwQFBgf/xAA2' +
        'EAEAAgECBAMGBQMEAwEAAAAAAQIDBBEFEiExBkFREzJhcYGRByIjQqEUM7EVF2LRJFLwkv/EABoB' +
        'AQEBAQEBAQAAAAAAAAAAAAEAAgMGBAX/xAAoEQEBAAIBBAECBgMAAAAAAAAAAQIRMQMSIUFRBBMU' +
        'YXGBofAisfH/2gAMAwEAAhEDEQA/APzBRXtH44AQKBQoFCggArQFBIUCBQIFAoUCBRSgAgUCgFIF' +
        'BABSgFKFAgUCBQKFAgUCBQIFAoUEgFIAUoBSAFIFAoUCBQKFBAUCgFIGdMdsk7Vhtw6abdb9I9HX' +
        'WsVjaI2hm5a4MjTj0ta9bfmn+G+IiI2joK522tAKkAECgUApQoEDG+OmT3o+rJQK48mmtXrX80fy' +
        '1bPRa8mCuTr2t6ukz+XOz4cQyvjtjttaEb25iggKCAoBkUAHx4Dz70AoFCgUKCACtAUEhQIFAgUC' +
        'hQIFFKACBQKAUgUEAFKAUoUCBQIFAoUCBQIFAgUChQSAUgBSgFIAUgUChQIFAoUEBQKAWIIIjeXZ' +
        'g0/Lta3W3p6Lgwckc1ven+G9jLL1GpAFYICpABAoFAKUKBACgAKmRQAY2pF67WjeHHlwzit6x5S7' +
        'iaxau0xvEmZaZs285WeXFOK3rE9pYO23KigmRQAFBB8coPwHoRQKFBABWgKCQoECgQKBQoECilAB' +
        'AoFAKQKCAClAKUKBAoECgUKBAoECgQKBQoJAKQApQCkAKQKBQoECgUKBAoJAKQOvTYf32j5NWnxe' +
        '0v192O7uZyvoyAK5tAKkAECgUApQoEAKAAqZFAABQAFQY2rF6zWXDek0vyy9BrzY/aU6e9HZrHLT' +
        'GU24lg2HVyFBABQy+OUH4T0YoIAK0BQSFAgUCBQKFAgUUoAIFAoBSBQQAUoBShQIFAgUChQIFAgU' +
        'CBQKFBIBSAFKAUgBSBQKFAgUChQIFBIBSBYjedoG/S4+bJzT2qbdROnFjjHjivn5sxXBsBUgAgUC' +
        'gFKFAgBQAFTIoAAKAAqAAgKADl1GPlvzR2lpd2SnPjmPPycPZ1xu45ZAK05igg+OUH4T0YCtAUEh' +
        'QIFAgUChQIFFKACBQKAUgUEAFKAUoUCBQIFAoUCBQIFAgUChQSAUgBSgFIAUgUChQIFAoUCBQSAU' +
        'gUCB34KcmGsec9ZcWKvPlrX1l6LGd9NRQVzaACBQKAUoUCAFAAVMigAAoACoACAoACgAOTUU5cu/' +
        'lPV2NOprvji3pLWN1WMuHIoOziKAD44FfivRigkKBAoECgUKBAopQAQKBQCkCggApQClCgQKBAoF' +
        'CgQKBAoECgUKCQCkAKUApACkCgUKBAoFCgQKCQCkCgQApTfpK75Jn0h2OfRx+S0+s7Olyy5bnAAy' +
        'hQKAUoUCAFAAVMigAAoACoACAoACgAKCZEyV5sdo9YZADzlW0bWmPSUfQ4CgA+OUH4z0goECgQKB' +
        'QoECilABAoFAKQKCAClAKUKBAoECgUKBAoECgQKBQoJAKQApQCkAKQKBQoECgUKBAoJAKQKBAClA' +
        'KQ7dLH6P1bmrTf2KtrheW5wKCIClCgQAoACpkUAAFAAVAAQFAAUABQTIoACgg4c3TNb5sWzPH69m' +
        't2nDheRQLL45QfjvSigQKBQoECilABAoFAKQKCAClAKUKBAoECgUKBAoECgQKBQoJAKQApQCkAKQ' +
        'KBQoECgUKBAoJAKQKBAClAKQApTt039iPm3NGknfFMekt7hly3OAFRFAgBQAFTIoAAKAAqAAgKAA' +
        'oACgmRQAFAAUEHFm/vWYMsk75bT8WLvOHCigmXxyg/JelFAoUCBRSgAgUCgFIFBABSgFKFAgUCBQ' +
        'KFAgUCBQQFBpCgkApAClAKQApAoFCgQKBQoECgkApAoEAKUApAClAKQ6dHPW0fV0uLT25c0fHo7n' +
        'LOeW5wKDJAUABUyKAACgAKgAICgAKAAoJkUABQAFBAJ6RM+itee3Lhn49FPItcSg7vnFAB8coPy3' +
        'phQIFFKACBQKAUgUEAFKAUoUCBQIFAoUCBQIFBAUGkKCQCkAKUApACkCgUKBAoFCgQKCQCkCgQAp' +
        'QCkAKUApAClETtMTHeHo1tFqRaPOHnuvS33pNPOGM542ca3gri0AqZFAABQAFQAEBQAFAAUEyKAA' +
        'oACggKAA5tVbrWvp1dPaN5cN7c95t6t4TyxnfDFQdHEUEHxyg/MemFFKACBQKBa1m07ViZn4OjHo' +
        '7T1vPL8FvQc7OmK9/drMu6mnx0/bvPrLYz3HTjro7z70xX+W2ujpHe1pdCjuq01RpsUft3+bOMdI' +
        '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',
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
