import { parseDocumentSource } from '../model/front-matter';
import type { DocumentFile, DocumentType } from '../model/types';
import { hrefFor, pathToSlug } from './slug';

const FOLDER_TYPES: Record<string, DocumentType> = { lessons: 'lesson', research: 'research', news: 'news' };

/** Builds a document from its library path and file content; never throws (FR-008). */
export function toDocument(path: string, raw: string): DocumentFile {
  const { meta, body } = parseDocumentSource(raw);
  const parts = path.split('/');
  const fileName = parts.at(-1)!.replace(/\.md$/i, '');
  const folder = parts.at(-2);
  const typeFolder = parts.findIndex((p) => p in FOLDER_TYPES);
  const heading = /^#\s+(.+)$/m.exec(body)?.[1]?.trim();

  return {
    path,
    slug: pathToSlug(path),
    href: hrefFor(path),
    title: meta?.title ?? heading ?? fileName,
    type: meta?.type ?? (folder ? (FOLDER_TYPES[folder] ?? 'other') : 'other'),
    domain: meta?.domain ?? (typeFolder > 0 ? (parts[typeFolder - 1] ?? null) : null),
    date: meta?.date ?? /^\d{4}-\d{2}-\d{2}/.exec(fileName)?.[0] ?? null,
    sources: meta?.sources ?? [],
    body,
    missingMetadata: meta === null,
  };
}
