import { describe, expect, it } from 'vitest';

import { sanitizeServerHtml } from './sanitize';

describe('sanitizeServerHtml', () => {
  describe('script-like tag removal', () => {
    it('strips <script> tags', () => {
      const out = sanitizeServerHtml('<script>alert("xss")</script><p>ok</p>');
      expect(out).not.toContain('<script');
      expect(out).not.toContain('</script');
      expect(out).toContain('<p>ok</p>');
    });

    it('strips <iframe> tags', () => {
      const out = sanitizeServerHtml(
        '<iframe src="https://evil.example"></iframe>',
      );
      expect(out).not.toContain('<iframe');
      expect(out).not.toContain('</iframe');
    });

    it('strips <style> tags', () => {
      const out = sanitizeServerHtml(
        '<style>body{display:none}</style><p>hi</p>',
      );
      expect(out).not.toContain('<style');
      expect(out).not.toContain('</style');
      expect(out).toContain('<p>hi</p>');
    });

    it('strips the full set of dangerous tags', () => {
      for (const tag of [
        'script',
        'iframe',
        'object',
        'embed',
        'link',
        'meta',
        'style',
      ]) {
        const out = sanitizeServerHtml(`<${tag}></${tag}>`);
        expect(out).not.toContain(`<${tag}`);
        expect(out).not.toContain(`</${tag}`);
      }
    });
  });

  describe('on* event-handler stripping', () => {
    it('strips double-quoted handlers and keeps other attributes', () => {
      const out = sanitizeServerHtml('<a href="/x" onclick="steal()">link</a>');
      expect(out).not.toContain('onclick');
      expect(out).toContain('href="/x"');
      expect(out).toContain('>link</a>');
    });

    it('strips single-quoted handlers', () => {
      const out = sanitizeServerHtml("<div onmouseover='track()'>hi</div>");
      expect(out).not.toContain('onmouseover');
    });

    it('strips unquoted handler values', () => {
      const out = sanitizeServerHtml('<img src="/a.png" onerror=alert(1)>');
      expect(out).not.toContain('onerror');
      expect(out).toContain('src="/a.png"');
    });
  });

  describe('javascript: URL stripping', () => {
    it('strips javascript: in href (quoted)', () => {
      const out = sanitizeServerHtml('<a href="javascript:alert(1)">x</a>');
      expect(out).not.toContain('javascript:');
    });

    it('strips javascript: in src (quoted)', () => {
      const out = sanitizeServerHtml('<img src="javascript:alert(1)">');
      expect(out).not.toContain('javascript:');
    });

    it('strips javascript: in href (unquoted)', () => {
      const out = sanitizeServerHtml('<a href=javascript:alert(1)>x</a>');
      expect(out).not.toContain('javascript:');
    });
  });

  describe('benign markup', () => {
    it('passes ordinary formatting through unchanged', () => {
      const input =
        '<p class="lead">Hello <strong>world</strong> &amp; ' +
        '<a href="/about" title="About us">about</a>.</p>';
      expect(sanitizeServerHtml(input)).toBe(input);
    });

    it('leaves a plain paragraph untouched', () => {
      const input = '<p>Just <em>text</em> here.</p>';
      expect(sanitizeServerHtml(input)).toBe(input);
    });
  });
});
