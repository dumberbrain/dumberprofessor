export const DOCUMENT_TYPES = ['lesson', 'research', 'news'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number] | 'other';

export interface DocumentFile {
  /** relative to the library root, `/` separators */
  path: string;
  slug: string[];
  href: string;
  title: string;
  type: DocumentType;
  domain: string | null;
  /** YYYY-MM-DD */
  date: string | null;
  sources: string[];
  body: string;
  missingMetadata: boolean;
}

export interface TocItem {
  id: string;
  text: string;
  depth: 2 | 3;
}
