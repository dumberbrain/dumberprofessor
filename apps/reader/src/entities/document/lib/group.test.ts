import { describe, expect, it } from 'vitest';
import type { DocumentFile } from '../model/types';
import { groupLibrary, neighbours } from './group';

const doc = (path: string, over: Partial<DocumentFile>): DocumentFile => ({
  path,
  slug: [],
  href: `/docs/${path}`,
  title: path,
  type: 'other',
  domain: null,
  date: null,
  sources: [],
  body: '',
  missingMetadata: false,
  ...over,
});

const docs = [
  doc('s/l/old', { type: 'lesson', domain: 'security', date: '2026-10-01' }),
  doc('s/l/new', { type: 'lesson', domain: 'security', date: '2026-10-30' }),
  doc('s/l/undated', { type: 'lesson', domain: 'security' }),
  doc('s/r/csp', { type: 'research', domain: 'security', date: '2026-10-31' }),
  doc('e/l/a', { type: 'lesson', domain: 'english', date: '2026-10-29' }),
  doc('n/1', { type: 'news', date: '2026-10-29' }),
  doc('n/2', { type: 'news', date: '2026-10-31' }),
  doc('x', { missingMetadata: true }),
];

describe('groupLibrary', () => {
  const lib = groupLibrary(docs, { security: 'Təhlükəsizlik', english: 'English' });

  it('sorts domains by name (Azerbaijani collation) and documents newest first, undated last', () => {
    expect(lib.domains.map((d) => d.name)).toEqual(['English', 'Təhlükəsizlik']);
    expect(lib.domains[1]!.lessons.map((d) => d.path)).toEqual(['s/l/new', 's/l/old', 's/l/undated']);
    expect(lib.domains[1]!.research.map((d) => d.path)).toEqual(['s/r/csp']);
  });

  it('lists news newest first and keeps the rest as unsorted', () => {
    expect(lib.news.map((d) => d.path)).toEqual(['n/2', 'n/1']);
    expect(lib.unsorted.map((d) => d.path)).toEqual(['x']);
    expect(lib.total).toBe(8);
  });

  it('falls back to the domain id when no name is configured', () => {
    expect(groupLibrary([doc('a', { type: 'lesson', domain: 'music' })], {}).domains[0]!.name).toBe('music');
  });

  it('finds previous and next documents within the same group', () => {
    expect(neighbours(lib, 's/l/old')).toEqual({ previous: docs[1], next: docs[2] });
    expect(neighbours(lib, 'n/2')).toEqual({ previous: null, next: docs[5] });
  });
});
