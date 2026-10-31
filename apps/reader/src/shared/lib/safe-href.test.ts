import { describe, expect, it } from 'vitest';
import { isExternal, safeHref } from './safe-href';

describe('safeHref', () => {
  it.each([
    'https://example.com/a',
    'http://x.y',
    'mailto:a@b.c',
    '#intro',
    '/docs/a',
    './b.md',
    '../c.md',
    'lessons/x.md',
  ])('keeps %s', (url) => expect(safeHref(url)).toBe(url));

  it.each([
    'javascript:alert(1)',
    ' JavaScript:alert(1)',
    'data:text/html,<b>x</b>',
    'vbscript:x',
    '',
    null,
    undefined,
  ])('rejects %s', (url) => expect(safeHref(url)).toBeNull());

  it('detects external links', () => {
    expect(isExternal('https://a.b')).toBe(true);
    expect(isExternal('/docs/a')).toBe(false);
  });
});
