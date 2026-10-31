import { describe, expect, it } from 'vitest';
import type { DocumentFile } from '../model/types';
import { normalize, searchDocuments } from './search';

const doc = (path: string, over: Partial<DocumentFile>): DocumentFile => ({
  path,
  slug: [],
  href: `/docs/${path}`,
  title: path,
  type: 'lesson',
  domain: 'security',
  date: '2026-10-30',
  sources: [],
  body: '',
  missingMetadata: false,
  ...over,
});

const docs = [
  doc('a', { title: 'Şərt operatorları', date: '2026-10-01' }),
  doc('b', {
    title: 'CSP',
    body: 'Bu **şərt** ilə [CSP](https://x.y) qaydası `nonce` tələb edir.',
    type: 'research',
    date: '2026-10-31',
  }),
  doc('c', { title: 'Articles', body: 'Use the article.', domain: 'english', date: '2026-10-29' }),
  doc('n', { title: 'Hesabat', body: 'node-forge advisory', type: 'news', domain: null }),
];

describe('normalize', () => {
  it('lowercases with Azerbaijani rules', () => {
    expect(normalize('ŞƏRT İ I')).toBe('şərt i ı');
  });
});

describe('searchDocuments', () => {
  it('ranks title matches first, then body matches, with a snippet without Markdown', () => {
    const results = searchDocuments(docs, { q: 'ŞƏRT' });
    expect(results.map((r) => r.document.path)).toEqual(['a', 'b']);
    expect(results[0]!.titleMatch).toBe(true);
    expect(results[1]!.snippet).toContain('Bu şərt ilə CSP qaydası nonce tələb edir.');
  });

  it('filters by domain and type, also without a query', () => {
    expect(searchDocuments(docs, { q: 'şərt', type: 'research' }).map((r) => r.document.path)).toEqual(['b']);
    expect(searchDocuments(docs, { domain: 'english' }).map((r) => r.document.path)).toEqual(['c']);
    expect(searchDocuments(docs, { type: 'news' })[0]!.snippet).toBeNull();
  });

  it('returns nothing for no match or no criteria', () => {
    expect(searchDocuments(docs, { q: 'kubernetes' })).toEqual([]);
    expect(searchDocuments(docs, {})).toEqual([]);
  });

  it('caps very long queries', () => {
    expect(() => searchDocuments(docs, { q: 'x'.repeat(5000) })).not.toThrow();
  });
});
