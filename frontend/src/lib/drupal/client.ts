// JSON:API client for the Drupal backend.
//
// Thin layer around fetch:
//   - acquires + caches an OAuth bearer token (client_credentials)
//   - builds the JSON:API query string the way jsonapi_extras expects
//     (filter, include, fields, sort, page)
//   - validates the response against a Zod schema and throws on shape drift
//   - threads Next's data cache (revalidate / tags) through for ISR
//
// Do not import the OAuth helpers anywhere else — they're 'server-only'.

import 'server-only';

import type { z, ZodTypeAny } from 'zod';

import { env } from '@/lib/env';
import {
  getClientCredentialsToken,
  OAuthError,
  invalidateToken,
} from '@/lib/oauth/token';

/** ----------------------------------------------------------------------
 * Query helpers
 * ----------------------------------------------------------------------- */

export interface JsonApiQuery {
  /** ?filter[...] — pass key/value pairs, value can be string|number|boolean */
  filter?: Record<string, string | number | boolean>;
  /** ?include=a,b.c */
  include?: string[];
  /** ?fields[type]=a,b */
  fields?: Record<string, string[]>;
  /** ?sort=-changed,title */
  sort?: string[];
  /** ?page[offset]=10&page[limit]=20 */
  page?: { offset?: number; limit?: number };
  /** ?resourceVersion=rel:working-copy (for draft fetches) */
  resourceVersion?: string;
}

export function buildJsonApiQuery(q: JsonApiQuery): string {
  const params = new URLSearchParams();
  if (q.filter) {
    for (const [k, v] of Object.entries(q.filter)) {
      params.set(`filter[${k}]`, String(v));
    }
  }
  if (q.include?.length) {
    params.set('include', q.include.join(','));
  }
  if (q.fields) {
    for (const [type, names] of Object.entries(q.fields)) {
      params.set(`fields[${type}]`, names.join(','));
    }
  }
  if (q.sort?.length) {
    params.set('sort', q.sort.join(','));
  }
  if (q.page?.offset != null) {
    params.set('page[offset]', String(q.page.offset));
  }
  if (q.page?.limit != null) {
    params.set('page[limit]', String(q.page.limit));
  }
  if (q.resourceVersion) {
    params.set('resourceVersion', q.resourceVersion);
  }
  return params.toString();
}

/** ----------------------------------------------------------------------
 * Errors
 * ----------------------------------------------------------------------- */

export class DrupalApiError extends Error {
  public readonly status: number;
  public readonly url: string;
  constructor(message: string, status: number, url: string) {
    super(message);
    this.name = 'DrupalApiError';
    this.status = status;
    this.url = url;
  }
}

export class DrupalValidationError extends Error {
  public readonly issues: z.ZodIssue[];
  public readonly url: string;
  constructor(message: string, issues: z.ZodIssue[], url: string) {
    super(message);
    this.name = 'DrupalValidationError';
    this.issues = issues;
    this.url = url;
  }
}

/** ----------------------------------------------------------------------
 * Core fetch
 * ----------------------------------------------------------------------- */

export interface DrupalFetchOptions<S extends ZodTypeAny> {
  /** Path under /jsonapi, e.g. 'node/article' or 'articles' (the JSON:API extras alias). */
  resource: string;
  query?: JsonApiQuery;
  /** Zod schema applied to the parsed JSON. Throws DrupalValidationError on mismatch. */
  schema: S;
  /** Pass-through to Next's fetch — revalidate seconds, tags, no-store, etc. */
  next?: { revalidate?: number | false; tags?: string[] };
  /** Force draft fetch — appends ?resourceVersion=rel:working-copy. */
  draft?: boolean;
  /** Override the HTTP method (default GET). */
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  /** Body for non-GET requests. */
  body?: unknown;
  /** Skip auth (anonymous request). */
  anonymous?: boolean;
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await getClientCredentialsToken();
  return { Authorization: `Bearer ${token}` };
}

export async function drupalFetch<S extends ZodTypeAny>(
  opts: DrupalFetchOptions<S>,
): Promise<z.infer<S>> {
  const query = { ...(opts.query ?? {}) };
  if (opts.draft) {
    query.resourceVersion = query.resourceVersion ?? 'rel:working-copy';
  }
  const qs = buildJsonApiQuery(query);
  const url = new URL(
    `/jsonapi/${opts.resource}${qs ? `?${qs}` : ''}`,
    env.DRUPAL_BASE_URL,
  ).toString();

  const headers: Record<string, string> = {
    Accept: 'application/vnd.api+json',
  };
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/vnd.api+json';
  }
  if (!opts.anonymous) {
    Object.assign(headers, await authHeader());
  }

  const performRequest = async (): Promise<Response> => {
    // Under `exactOptionalPropertyTypes` an explicit `body: undefined` is not
    // assignable to RequestInit — only omitting the key is. Build it up.
    const init: RequestInit = {
      method: opts.method ?? 'GET',
      headers,
      next: opts.next ?? { revalidate: 60 },
    };
    if (opts.body !== undefined) {
      init.body = JSON.stringify(opts.body);
    }
    return fetch(url, init);
  };

  let res = await performRequest();

  // Retry once on a 401 — token might have been invalidated server-side.
  if (res.status === 401 && !opts.anonymous) {
    invalidateToken(env.DRUPAL_CLIENT_ID);
    Object.assign(headers, await authHeader());
    res = await performRequest();
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new DrupalApiError(
      `Drupal returned ${res.status} ${res.statusText} for ${url}: ${text.slice(0, 200)}`,
      res.status,
      url,
    );
  }

  const json = (await res.json()) as unknown;
  const parsed = opts.schema.safeParse(json);
  if (!parsed.success) {
    throw new DrupalValidationError(
      `JSON:API response from ${url} failed schema validation`,
      parsed.error.issues,
      url,
    );
  }
  return parsed.data;
}

export function isOAuthError(err: unknown): err is OAuthError {
  return err instanceof OAuthError;
}
