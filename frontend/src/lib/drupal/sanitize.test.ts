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

    it('strips a script tag that a nested tag reassembles', () => {
      const out = sanitizeServerHtml(
        '<scr<script>ipt>alert(1)</scr<script>ipt><p>ok</p>',
      );
      expect(out.toLowerCase()).not.toContain('<script');
      expect(out.toLowerCase()).not.toContain('</script');
      expect(out).toContain('<p>ok</p>');
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

    it('strips a handler glued to the previous quoted value', () => {
      const out = sanitizeServerHtml('<img src="/a.png"onerror=alert(1)>');
      expect(out).not.toContain('onerror');
      expect(out).not.toContain('alert');
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

    it('strips javascript: when whitespace follows the quote', () => {
      const out = sanitizeServerHtml('<a href=" javascript:alert(1)">x</a>');
      expect(out.toLowerCase()).not.toContain('javascript:');
    });

    it('strips a javascript scheme written with a character reference', () => {
      const out = sanitizeServerHtml('<a href="javascript&#58;alert(1)">x</a>');
      expect(out.toLowerCase()).not.toContain('javascript');
      expect(out.toLowerCase()).not.toContain('&#58;');
      expect(out).toContain('>x</a>');
    });

    it('strips a scheme whose letters are character references', () => {
      const out = sanitizeServerHtml(
        '<a href="java&#115;cript:alert(1)">x</a>',
      );
      expect(out.toLowerCase()).not.toContain('cript');
      expect(out).toContain('>x</a>');
    });
  });

  describe('event names written with a character reference', () => {
    it('strips an onclick whose first letter is a character reference', () => {
      const out = sanitizeServerHtml(
        '<img src="/a.png" &#111;nclick=alert(1)>',
      );
      expect(out.toLowerCase()).not.toContain('nclick');
      expect(out.toLowerCase()).not.toContain('alert');
      expect(out).toContain('src="/a.png"');
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

    it('does not throw when an attribute contains a lone surrogate', () => {
      const input = '<a href="&#xD800;ok" title="t">x</a>';
      expect(() => sanitizeServerHtml(input)).not.toThrow();
      expect(sanitizeServerHtml(input)).toContain('href=');
    });
  });
});
