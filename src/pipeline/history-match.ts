import type { Candidate } from '../schemas/candidate.js';
import type { IndexedItem } from '../schemas/report.js';
import { readIndex } from '../store/reports.js';
import { productVersionKey, SIMILARITY_THRESHOLD, titleSimilarity } from './dedupe.js';

const HISTORY_DAYS = 90;

function matches(c: Candidate, item: IndexedItem): boolean {
  if (c.canonicalUrl === item.canonicalUrl) return true;
  const key = productVersionKey(c.title);
  if (key && key === productVersionKey(item.title)) return true;
  return titleSimilarity(c.title, item.title) >= SIMILARITY_THRESHOLD;
}

/**
 * FR-008: flags candidates that resemble an item reported in the last 90 days. The CLI never
 * decides; the skill applies FR-008a and either reports an update or explains the exclusion.
 */
export function matchHistory(candidates: Candidate[], index: IndexedItem[], now: Date): Candidate[] {
  const cutoff = new Date(now.getTime() - HISTORY_DAYS * 86_400_000).toISOString().slice(0, 10);
  const recent = index
    .filter((i) => i.reportDate >= cutoff)
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate) || b.itemId.localeCompare(a.itemId));
  return candidates.map((c) => {
    const hit = recent.find((item) => matches(c, item));
    return hit ? { ...c, possibleUpdateOf: hit.itemId } : c;
  });
}

export async function matchHistoryStage(candidates: Candidate[], now: Date): Promise<Candidate[]> {
  return matchHistory(candidates, await readIndex(), now);
}
