import 'server-only';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { connection } from 'next/server';
import { serverEnv } from '@/shared/config/env.server';
import { slugToPath } from '../lib/slug';
import { toDocument } from '../lib/to-document';
import type { DocumentFile } from '../model/types';

// Read on every request (FR-011): a document saved by Claude Code appears on refresh.

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(
    entries.map((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : Promise.resolve(e.name.endsWith('.md') ? [join(dir, e.name)] : []),
    ),
  );
  return nested.flat();
}

const toLibraryPath = (root: string, file: string) => relative(root, file).split(sep).join('/');

export async function listDocuments(): Promise<DocumentFile[]> {
  await connection();
  const root = serverEnv().documentsDir;
  const files = (await walk(root)).filter((f) => toLibraryPath(root, f) !== 'README.md');
  return Promise.all(files.map(async (f) => toDocument(toLibraryPath(root, f), await readFile(f, 'utf8'))));
}

export async function getDocument(slug: string[]): Promise<DocumentFile | null> {
  await connection();
  const root = serverEnv().documentsDir;
  let path: string;
  try {
    path = slugToPath(slug);
  } catch {
    return null; // malformed percent-encoding
  }
  const file = resolve(root, path);
  // Traversal guard: the resolved file must stay inside the library.
  if (!file.startsWith(root + sep) || path === 'README.md') return null;
  const raw = await readFile(file, 'utf8').catch(() => null);
  return raw === null ? null : toDocument(toLibraryPath(root, file), raw);
}
