import { describe, expect, it } from 'vitest';
import { parseDocumentSource } from './front-matter';

describe('parseDocumentSource', () => {
  it('reads valid front matter and the body', () => {
    const { meta, body } = parseDocumentSource(
      '---\ntitle: XSS\ntype: lesson\ndomain: security\ndate: 2026-10-30\nsources:\n  - https://owasp.org/\n---\n\n# XSS\n',
    );
    expect(meta).toEqual({
      title: 'XSS',
      type: 'lesson',
      domain: 'security',
      date: '2026-10-30',
      sources: ['https://owasp.org/'],
    });
    expect(body.trim()).toBe('# XSS');
  });

  it('accepts a quoted date string and drops invalid source URLs', () => {
    const { meta } = parseDocumentSource(
      '---\ntitle: N\ntype: news\ndate: "2026-10-31"\nsources: [nope, https://a.b/]\n---\nx',
    );
    expect(meta).toMatchObject({ date: '2026-10-31', sources: ['https://a.b/'] });
  });

  it('returns null meta for missing or invalid front matter', () => {
    expect(parseDocumentSource('# Only body').meta).toBeNull();
    expect(parseDocumentSource('---\ntitle: X\ntype: poem\ndate: 2026-10-31\n---\nx').meta).toBeNull();
    expect(parseDocumentSource('---\n: : broken\n---\nx').meta).toBeNull();
  });
});
