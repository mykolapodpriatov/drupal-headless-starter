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

/**
 * Decode the character references an HTML parser decodes inside an attribute.
 * Named references other than `colon` are left alone so `&amp;` in a query
 * string stays a query string. The result is used for the check, not written
 * back, so text outside attributes is unchanged.
 */
function decodeAttributeReference(value: string): string {
  return value.replace(
    /&(?:#x([0-9a-f]+)|#(\d+)|colon);?/gi,
    (entity, hex: string | undefined, dec: string | undefined) => {
      if (hex === undefined && dec === undefined) {
        return entity.endsWith(';') ? ':' : entity;
      }
      const code =
        hex !== undefined
          ? Number.parseInt(hex, 16)
          : Number.parseInt(dec ?? '', 10);
      if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) return entity;
      // Lone surrogates are not Unicode scalar values. fromCodePoint throws
      // on them, and a throw here would take down the page that is being
      // sanitised.
      if (code >= 0xd800 && code <= 0xdfff) return entity;
      return String.fromCodePoint(code);
    },
  );
}

function attributeValue(assignment: string | undefined): string {
  if (!assignment) return '';
  const raw = assignment.replace(/^\s*=\s*/, '');
  const quoted = raw.match(/^(['"])([\s\S]*)\1$/);
  return quoted?.[2] ?? raw;
}

/**
 * Drop event-handler and javascript-URL attributes, including the forms where
 * the name or the scheme is written with a character reference. The HTML
 * parser decodes those references before it decides the name or the URL, so
 * `&#111;nclick` is `onclick` and `javascript&#58;` is `javascript:`.
 */
function stripDangerousAttributes(html: string): string {
  return html.replace(/<[^>]*>/g, (tag) =>
    tag.replace(
      /\s([^\s=/>]+)(\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/g,
      (attr, name: string, assignment: string | undefined) => {
        const decodedName = decodeAttributeReference(name)
          .replace(/[\u0000-\u0020]+/g, '')
          .toLowerCase();
        if (/^on[a-z]/.test(decodedName)) return '';
        if (decodedName === 'href' || decodedName === 'src') {
          const decodedValue = decodeAttributeReference(
            attributeValue(assignment),
          )
            .replace(/[\u0000-\u0020]+/g, '')
            .toLowerCase();
          if (decodedValue.startsWith('javascript:')) return '';
        }
        return attr;
      },
    ),
  );
}

export function sanitizeServerHtml(input: string): string {
  // One pass turns `<scr<script>ipt>` into `<script>`: the inner tag is
  // removed and the outer pieces join. Keep stripping while the string
  // shrinks. Each pass deletes a match, so the loop ends.
  let current = input;
  let previous = '';
  while (previous !== current) {
    previous = current;
    current = current.replace(SCRIPT_LIKE_TAG, '');
  }
  return stripDangerousAttributes(current);
}
