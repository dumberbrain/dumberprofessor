import type { Category, Domain } from '../schemas/enums.js';
import type { IndexedItem } from '../schemas/report.js';
import { readIndex } from './reports.js';

export interface SearchQuery {
  q?: string;
  /** inclusive YYYY-MM-DD */
  from?: string;
  to?: string;
  category?: Category;
  domain?: Domain;
}

const haystack = (i: IndexedItem) =>
  [i.title, i.summaryAz, i.whyItMattersAz, i.implicationsAz, ...i.technologies, ...i.facts].join('\n').toLowerCase();

/** Linear scan of the item index — ample for a personal archive (research.md R3). Newest first. */
export async function searchItems(query: SearchQuery): Promise<IndexedItem[]> {
  const needle = query.q?.trim().toLowerCase();
  const items = (await readIndex()).filter(
    (i) =>
      (!query.from || i.reportDate >= query.from) &&
      (!query.to || i.reportDate <= query.to) &&
      (!query.category || i.category === query.category) &&
      (!query.domain || i.domains.includes(query.domain)) &&
      (!needle || haystack(i).includes(needle)),
  );
  return items.sort((a, b) => b.reportDate.localeCompare(a.reportDate) || a.rank - b.rank);
}
