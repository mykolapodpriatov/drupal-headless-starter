# Preview mode

Next.js calls it "Draft Mode" since v13, but the concept hasn't changed:
flip an in-cookie flag that the rendering layer reads, and Server Components
fetch unpublished content on that request only.

## The handshake

```
Drupal editor                Drupal                       Next.js
      │                         │                            │
      │  edit + Save as draft   │                            │
      ├────────────────────────▶│                            │
      │                         │                            │
      │           302 → preview_url                          │
      │                         │  preview_url =             │
      │                         │   {NEXT_PUBLIC_FRONTEND_URL}│
      │                         │   /api/preview             │
      │                         │   ?secret={SHARED_SECRET}  │
      │                         │   &slug=/articles/foo      │
      │                         │   &uuid={node_uuid}        │
      │◀────────────────────────┤                            │
      │                                                      │
      │  GET /api/preview?secret=...                         │
      ├─────────────────────────────────────────────────────▶│
      │                                                      │
      │         (validate secret, draftMode().enable(),      │
      │          302 → /articles/foo)                        │
      │◀─────────────────────────────────────────────────────┤
      │                                                      │
      │  GET /articles/foo (with __prerender_bypass cookie)  │
      ├─────────────────────────────────────────────────────▶│
      │                                                      │
      │         RSC sees draftMode().isEnabled === true,     │
      │         appends ?resourceVersion=rel:working-copy    │
      │         to the JSON:API call, renders draft.         │
```

## Wiring on the Drupal side

This is intentionally not a Drupal module — keep it as a tiny custom module or
a one-liner `hook_entity_view_alter`. Pseudocode:

```php
function mymodule_entity_view_alter(array &$build, EntityInterface $entity, EntityViewDisplayInterface $display) {
  if ($entity->bundle() !== 'article') {
    return;
  }
  $url = sprintf(
    '%s/api/preview?secret=%s&slug=%s&uuid=%s',
    \Drupal::config('headless_starter.settings')->get('frontend_url'),
    \Drupal::config('headless_starter.settings')->get('preview_secret'),
    urlencode('/articles/' . $entity->get('path')->alias),
    $entity->uuid()
  );
  $build['#preview_url'] = $url;
}
```

A "View on frontend" button gets added in the node edit form via a route.

## On the Next.js side

`src/app/api/preview/route.ts`:

1. Validates `secret` against `process.env.DRUPAL_PREVIEW_SECRET` using
   `crypto.timingSafeEqual` to avoid timing attacks.
2. Validates `slug` starts with `/` and doesn't contain `\r\n` (open redirect
   guard).
3. Calls `draftMode().enable()` — Next.js sets the `__prerender_bypass` and
   `__next_preview_data` cookies.
4. `redirect(slug)`.

The article page reads `draftMode().isEnabled` and, when true, changes the
JSON:API query to `?resourceVersion=rel:working-copy` and adds
`Cache-Control: no-store` to its fetch options.

## Exiting preview

Hit `/api/preview/exit` (not included in this starter, ~5 lines) which calls
`draftMode().disable()` and redirects back to the article. Editors can also
just close the tab; the cookies are session-scoped.

## Caveats

- **ISR cache is bypassed in draft mode** — every preview request hits Drupal.
  That's correct, but it also means a slow Drupal backend equals slow previews.
- **draft mode is per-browser** — sharing a preview URL with someone outside
  Drupal won't show them the draft. By design.
- **No granular permissions** — anyone with the preview secret can see all
  drafts. If you need per-user preview, layer OAuth2 PKCE on top and check the
  editor's roles in the route handler.
