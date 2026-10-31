import type { DocumentFile } from '../model/types';

export interface DomainGroup {
  id: string;
  name: string;
  lessons: DocumentFile[];
  research: DocumentFile[];
  other: DocumentFile[];
}

export interface Library {
  domains: DomainGroup[];
  news: DocumentFile[];
  unsorted: DocumentFile[];
  total: number;
}

const collator = new Intl.Collator('az');

/** Newest first; undated documents last; then by title. */
export function byDateDesc(a: DocumentFile, b: DocumentFile): number {
  if (a.date !== b.date) return a.date === null ? 1 : b.date === null ? -1 : b.date.localeCompare(a.date);
  return collator.compare(a.title, b.title);
}

export function groupLibrary(documents: DocumentFile[], names: Record<string, string>): Library {
  const domains = new Map<string, DomainGroup>();
  const news: DocumentFile[] = [];
  const unsorted: DocumentFile[] = [];
  for (const d of documents) {
    if (d.type === 'news') news.push(d);
    else if (!d.domain) unsorted.push(d);
    else {
      const group = domains.get(d.domain) ?? {
        id: d.domain,
        name: names[d.domain] ?? d.domain,
        lessons: [],
        research: [],
        other: [],
      };
      (d.type === 'lesson' ? group.lessons : d.type === 'research' ? group.research : group.other).push(d);
      domains.set(d.domain, group);
    }
  }
  for (const g of domains.values()) [g.lessons, g.research, g.other].forEach((list) => list.sort(byDateDesc));
  return {
    domains: [...domains.values()].sort((a, b) => collator.compare(a.name, b.name)),
    news: news.sort(byDateDesc),
    unsorted: unsorted.sort(byDateDesc),
    total: documents.length,
  };
}

/** Previous (newer) and next (older) document in the same list as `path`. */
export function neighbours(
  library: Library,
  path: string,
): { previous: DocumentFile | null; next: DocumentFile | null } {
  const lists = [library.news, library.unsorted, ...library.domains.flatMap((g) => [g.lessons, g.research, g.other])];
  for (const list of lists) {
    const i = list.findIndex((d) => d.path === path);
    if (i >= 0) return { previous: list[i - 1] ?? null, next: list[i + 1] ?? null };
  }
  return { previous: null, next: null };
}
