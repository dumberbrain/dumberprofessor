const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'into',
  'your',
  'you',
  'are',
  'was',
  'what',
  'how',
  'why',
  'new',
  'now',
  'its',
  'this',
  'that',
  'out',
  'has',
  'have',
  'all',
  'about',
  'introducing',
  'announcing',
  'released',
  'release',
  'reaches',
]);

/** Significant lowercase tokens of a title (length ≥ 3, stopwords removed). */
export function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .split(/[^a-z0-9.+#]+/)
      .map((t) => t.replace(/^\.+|\.+$/g, ''))
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t)),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return shared / (a.size + b.size - shared);
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Case-insensitive whole-term match ("React" matches "React 20", not "Reactive"). */
export function containsTerm(text: string, term: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${escape(term.toLowerCase())}([^a-z0-9]|$)`).test(text.toLowerCase());
}
