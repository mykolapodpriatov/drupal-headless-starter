// Conservative HTML sanitiser for content coming out of Drupal's text-format
// pipeline. Drupal already strips disallowed tags server-side (basic_html /
// full_html filter formats) but we run a second pass for defence-in-depth:
//
//   - kill <script>, <iframe>, <object>, <embed>, <link>, <meta>, <style>
//   - strip all on* event-handler attributes
//   - strip javascript: URLs from href / src
//
// This is intentionally regex-based — DOMPurify is the right answer if you
// need 100% coverage, but for the constrained set of formats this starter
// allows it's enough. Replace with DOMPurify if you broaden the formats.

const SCRIPT_LIKE_TAG =
  /<\/?(?:script|iframe|object|embed|link|meta|style)\b[^>]*>/gi;
const EVENT_HANDLER_ATTR = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_URL =
  /\s(href|src)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi;

export function sanitizeServerHtml(input: string): string {
  return input
    .replace(SCRIPT_LIKE_TAG, '')
    .replace(EVENT_HANDLER_ATTR, '')
    .replace(JS_URL, '');
}
