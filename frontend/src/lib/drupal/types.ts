// Types for the JSON:API resources we consume.
//
// Field names match the `publicName` in
// drupal/config/sync/jsonapi_extras.jsonapi_resource_config.node--article.yml —
// keep these in sync when you rename fields on the Drupal side.

import { z } from 'zod';

/** ----------------------------------------------------------------------
 * Primitives
 * ----------------------------------------------------------------------- */

export const isoDateSchema = z.string().refine(
  (v) => !Number.isNaN(Date.parse(v)),
  { message: 'Expected ISO-8601 datetime string' },
);

export const drupalIdSchema = z.string().uuid();

/** ----------------------------------------------------------------------
 * Media (file entity behind field_image)
 * ----------------------------------------------------------------------- */

export const fileResourceSchema = z.object({
  id: drupalIdSchema,
  type: z.literal('file--file'),
  attributes: z.object({
    uri: z.object({
      value: z.string(),
      url: z.string(),
    }),
    filemime: z.string(),
    filesize: z.number().int().nonnegative(),
  }),
});

export type FileResource = z.infer<typeof fileResourceSchema>;

/** ----------------------------------------------------------------------
 * Image — as referenced from an article. JSON:API delivers this as a
 * relationship with the file resource included via ?include=image.
 * ----------------------------------------------------------------------- */

export const mediaImageSchema = z.object({
  url: z.string(),
  alt: z.string(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
});

export type MediaImage = z.infer<typeof mediaImageSchema>;

/** ----------------------------------------------------------------------
 * Article node — the resource we'll fetch the most.
 *
 * Notes:
 *   - `slug` is the path alias surfaced via the jsonapi_extras `nested`
 *     enhancer (path.alias → slug).
 *   - `body` keeps Drupal's full text_with_summary shape (value + format
 *     + processed + summary). Rendering uses `processed` so we get the
 *     filter-format-processed HTML, never raw user input.
 * ----------------------------------------------------------------------- */

export const articleBodySchema = z.object({
  value: z.string(),
  format: z.string(),
  processed: z.string(),
  summary: z.string().nullable(),
});

export type ArticleBody = z.infer<typeof articleBodySchema>;

export const articleSchema = z.object({
  id: drupalIdSchema,
  type: z.literal('node--article'),
  attributes: z.object({
    title: z.string(),
    published: z.boolean(),
    slug: z.string().nullable(),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
    body: articleBodySchema.nullable(),
  }),
  relationships: z
    .object({
      image: z
        .object({
          data: z
            .object({
              id: drupalIdSchema,
              type: z.literal('file--file'),
            })
            .nullable(),
        })
        .optional(),
    })
    .optional(),
});

export type ArticleResource = z.infer<typeof articleSchema>;

/** A fully resolved article — what queries return after merging the
 *  JSON:API top-level `data` and `included` arrays. */
export interface Article {
  id: string;
  title: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  published: boolean;
  body: ArticleBody | null;
  image: MediaImage | null;
}

/** ----------------------------------------------------------------------
 * User (kept minimal; expand as needed).
 * ----------------------------------------------------------------------- */

export const userSchema = z.object({
  id: drupalIdSchema,
  type: z.literal('user--user'),
  attributes: z.object({
    display_name: z.string(),
    mail: z.string().email().nullable().optional(),
  }),
});

export type User = z.infer<typeof userSchema>;

/** ----------------------------------------------------------------------
 * Generic JSON:API envelope.
 * ----------------------------------------------------------------------- */

export const jsonApiCollectionSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    included: z.array(z.unknown()).optional(),
    meta: z
      .object({
        count: z.number().int().nonnegative().optional(),
      })
      .partial()
      .optional(),
    links: z.record(z.unknown()).optional(),
  });

export const jsonApiSingleSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: item,
    included: z.array(z.unknown()).optional(),
    links: z.record(z.unknown()).optional(),
  });
