import type { DocumentFile } from '../model/types';
import { byDateDesc } from './group';

export interface SearchQuery {
  q?: string;
  domain?: string;
  type?: string;
}

export interface SearchResult {
  document: DocumentFile;
  snippet: string | null;
  titleMatch: boolean;
}

const MAX_QUERY = 200;
const CONTEXT = 80;

/** Case-insensitive with Azerbaijani rules (İ→i, I→ı). */
export const normalize = (text: string) => text.toLocaleLowerCase('az');

/** Markdown → plain text, good enough for snippets. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[`*_~>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function snippetAround(text: string, index: number, length: number): string {
  const start = Math.max(0, index - CONTEXT);
  const end = Math.min(text.length, index + length + CONTEXT);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

/** Linear scan — ample for a personal library of ≤ 1,000 documents (research R5). */
export function searchDocuments(documents: DocumentFile[], query: SearchQuery): SearchResult[] {
  const q = normalize((query.q ?? '').trim().slice(0, MAX_QUERY));
  if (!q && !query.domain && !query.type) return [];
  const results: SearchResult[] = [];
  for (const document of documents) {
    if (query.domain && document.domain !== query.domain) continue;
    if (query.type && document.type !== query.type) continue;
    if (!q) {
      results.push({ document, snippet: null, titleMatch: false });
      continue;
    }
    const titleMatch = normalize(document.title).includes(q);
    const text = plainText(document.body);
    const index = normalize(text).indexOf(q);
    if (titleMatch || index >= 0) {
      results.push({ document, titleMatch, snippet: index >= 0 ? snippetAround(text, index, q.length) : null });
    }
  }
  return results.sort((a, b) => Number(b.titleMatch) - Number(a.titleMatch) || byDateDesc(a.document, b.document));
}
