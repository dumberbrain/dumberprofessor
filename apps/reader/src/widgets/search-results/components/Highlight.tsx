import { normalize } from '@/entities/document';

/** Marks every occurrence of `query` in `text` (case-insensitive, Azerbaijani rules). */
export function Highlight({ text, query }: { text: string; query: string }) {
  const q = normalize(query.trim());
  if (!q) return <>{text}</>;
  const haystack = normalize(text);
  const parts: React.ReactNode[] = [];
  let from = 0;
  for (let i = haystack.indexOf(q); i >= 0; i = haystack.indexOf(q, i + q.length)) {
    parts.push(text.slice(from, i), <mark key={i}>{text.slice(i, i + q.length)}</mark>);
    from = i + q.length;
  }
  parts.push(text.slice(from));
  return <>{parts}</>;
}
