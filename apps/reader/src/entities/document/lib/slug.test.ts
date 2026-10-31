import { describe, expect, it } from 'vitest';
import { hrefFor, pathToSlug, resolveRelative, slugToPath } from './slug';

describe('slug helpers', () => {
  it('round-trips paths with Azerbaijani letters and spaces', () => {
    const path = 'security/lessons/2026-10-30-şərt yoxlaması.md';
    expect(pathToSlug(path)).toEqual(['security', 'lessons', '2026-10-30-şərt yoxlaması']);
    expect(slugToPath(pathToSlug(path))).toBe(path);
    expect(hrefFor(path)).toBe('/docs/security/lessons/2026-10-30-%C5%9F%C9%99rt%20yoxlamas%C4%B1');
  });

  it('decodes URL-encoded slug segments', () => {
    expect(slugToPath(['news', '2026-10-31'])).toBe('news/2026-10-31.md');
    expect(slugToPath(['a%20b'])).toBe('a b.md');
  });

  it('resolves relative Markdown links from a document', () => {
    const from = 'security/lessons/2026-10-30-xss.md';
    expect(resolveRelative(from, '../research/2026-10-31-csp.md')).toEqual({
      path: 'security/research/2026-10-31-csp.md',
      hash: '',
    });
    expect(resolveRelative(from, './next.md#part')).toEqual({ path: 'security/lessons/next.md', hash: '#part' });
    expect(resolveRelative(from, '../../../outside.md')).toBeNull();
    expect(resolveRelative(from, 'image.png')).toBeNull();
  });
});
