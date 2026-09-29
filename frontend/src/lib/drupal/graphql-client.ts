// GraphQL Compose client for the Drupal backend.
//
// Parallel to client.ts's JSON:API transport, on purpose: same auth (OAuth2
// client_credentials via lib/oauth/token.ts), same "validate with zod, throw
// on drift" discipline, same ISR revalidate/tags plumbing threaded through to
// fetch(). What differs is the wire format: POST a query document to
// /graphql instead of building a filter/include/fields query string against
// /jsonapi/<resource>. See docs/architecture.md#why-both-jsonapi-and-graphql
// for why both exist.
//
// Do not import the OAuth helpers anywhere else, they're 'server-only'.

import 'server-only';

import type { z, ZodTypeAny } from 'zod';

import { DrupalApiError } from '@/lib/drupal/client';
import { env } from '@/lib/env';
import { getClientCredentialsToken, invalidateToken } from '@/lib/oauth/token';

/**
 * A GraphQL response that answered 200 but carries an `errors` array: the
 * spec's way of reporting a resolver-level failure (e.g. a field that does
 * not exist on the schema) without an HTTP error status.
 */
export class DrupalGraphQLError extends Error {
  public readonly errors: unknown[];
  public readonly url: string;
  constructor(message: string, errors: unknown[], url: string) {
    super(message);
    this.name = 'DrupalGraphQLError';
    this.errors = errors;
    this.url = url;
  }
}

export class DrupalGraphQLValidationError extends Error {
  public readonly issues: z.ZodIssue[];
  public readonly url: string;
  constructor(message: string, issues: z.ZodIssue[], url: string) {
    super(message);
    this.name = 'DrupalGraphQLValidationError';
    this.issues = issues;
    this.url = url;
  }
}

export interface DrupalGraphQLOptions<S extends ZodTypeAny> {
  query: string;
  variables?: Record<string, unknown>;
  /** Zod schema applied to the response's `data` field. */
  schema: S;
  /** Pass-through to Next's fetch: revalidate seconds, tags, no-store, etc. */
  next?: { revalidate?: number | false; tags?: string[] };
  /** Skip auth (anonymous request). */
  anonymous?: boolean;
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await getClientCredentialsToken();
  return { Authorization: `Bearer ${token}` };
}

interface GraphQLEnvelope {
  data?: unknown;
  errors?: unknown[];
}

export async function drupalGraphQL<S extends ZodTypeAny>(
  opts: DrupalGraphQLOptions<S>,
): Promise<z.infer<S>> {
  const url = new URL('/graphql', env.DRUPAL_BASE_URL).toString();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (!opts.anonymous) {
    Object.assign(headers, await authHeader());
  }

  const body = JSON.stringify({
    query: opts.query,
    variables: opts.variables ?? {},
  });

  const performRequest = (): Promise<Response> =>
    fetch(url, {
      method: 'POST',
      headers,
      body,
      next: opts.next ?? { revalidate: 60 },
    });

  let res = await performRequest();

  // Retry once on a 401: token might have been invalidated server-side.
  if (res.status === 401 && !opts.anonymous) {
    invalidateToken(env.DRUPAL_CLIENT_ID);
    Object.assign(headers, await authHeader());
    res = await performRequest();
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new DrupalApiError(
      `Drupal GraphQL returned ${res.status} ${res.statusText} for ${url}: ${text.slice(0, 200)}`,
      res.status,
      url,
      text,
    );
  }

  const json = (await res.json()) as GraphQLEnvelope;

  if (json.errors && json.errors.length > 0) {
    throw new DrupalGraphQLError(
      `GraphQL errors from ${url}: ${JSON.stringify(json.errors).slice(0, 200)}`,
      json.errors,
      url,
    );
  }

  const parsed = opts.schema.safeParse(json.data);
  if (!parsed.success) {
    throw new DrupalGraphQLValidationError(
      `GraphQL response from ${url} failed schema validation`,
      parsed.error.issues,
      url,
    );
  }
  return parsed.data;
}
