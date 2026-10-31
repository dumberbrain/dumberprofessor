import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDocument, listDocuments } from './repository.server';

vi.mock('next/server', () => ({ connection: async () => {} }));

const fixtures = resolve(__dirname, '../../../../e2e/fixtures/documents');

beforeEach(() => {
  process.env.DOCUMENTS_DIR = fixtures;
});
afterEach(() => {
  delete process.env.DOCUMENTS_DIR;
});

describe('listDocuments', () => {
  it('lists every Markdown file except the root README', async () => {
    const paths = (await listDocuments()).map((d) => d.path).sort();
    expect(paths).toEqual([
      'english/lessons/2026-10-29-articles.md',
      'malicious.md',
      'news/2026-10-29.md',
      'news/2026-10-31.md',
      'no-meta.md',
      'security/lessons/2026-10-30-xss-basics.md',
      'security/research/2026-10-31-csp.md',
    ]);
  });

  it('falls back to the first heading and marks missing metadata', async () => {
    const doc = (await listDocuments()).find((d) => d.path === 'no-meta.md')!;
    expect(doc).toMatchObject({
      title: 'Metadatasız qeyd',
      type: 'other',
      domain: null,
      date: null,
      missingMetadata: true,
    });
  });

  it('returns an empty list when the folder does not exist', async () => {
    process.env.DOCUMENTS_DIR = join(fixtures, 'missing');
    expect(await listDocuments()).toEqual([]);
  });
});

describe('getDocument', () => {
  it('reads a document by slug', async () => {
    const doc = await getDocument(['security', 'lessons', '2026-10-30-xss-basics']);
    expect(doc).toMatchObject({ title: 'XSS basics', type: 'lesson', domain: 'security', date: '2026-10-30' });
    expect(doc?.body).toContain('```ts');
  });

  it('refuses paths outside the library and unknown slugs', async () => {
    expect(await getDocument(['..', '..', 'package'])).toBeNull();
    expect(await getDocument(['%2E%2E', 'package'])).toBeNull();
    expect(await getDocument(['README'])).toBeNull();
    expect(await getDocument(['nope'])).toBeNull();
  });
});

describe('freshness', () => {
  it('sees added, changed and deleted files on the next call', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'reader-docs-'));
    process.env.DOCUMENTS_DIR = dir;
    expect(await listDocuments()).toEqual([]);
    writeFileSync(join(dir, 'a.md'), '# One');
    expect((await listDocuments()).map((d) => d.title)).toEqual(['One']);
    writeFileSync(join(dir, 'a.md'), '# Two');
    expect((await getDocument(['a']))?.title).toBe('Two');
    rmSync(join(dir, 'a.md'));
    expect(await listDocuments()).toEqual([]);
  });
});
