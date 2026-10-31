import type { Candidate } from '../schemas/candidate.js';
import { jaccard, titleTokens } from './text.js';

export const SIMILARITY_THRESHOLD = 0.6;

/** "Next.js 16.1 is out" → "next.js@16.1"; requires a dotted version to avoid "Top 10". */
export function productVersionKey(title: string): string | null {
  const m = /([A-Za-z][A-Za-z0-9.+#-]*)\s+v?(\d+\.\d+(?:\.\d+)?)\b/.exec(title);
  return m ? `${m[1]!.toLowerCase().replace(/\.$/, '')}@${m[2]}` : null;
}

export function titleSimilarity(a: string, b: string): number {
  return jaccard(titleTokens(a), titleTokens(b));
}

export function isSameStory(a: Candidate, b: Candidate): boolean {
  if (a.canonicalUrl === b.canonicalUrl) return true;
  const ka = productVersionKey(a.title);
  if (ka && ka === productVersionKey(b.title)) return true;
  return titleSimilarity(a.title, b.title) >= SIMILARITY_THRESHOLD;
}

function byPrimaryPreference(a: Candidate, b: Candidate): number {
  if (a.tier !== b.tier) return a.tier - b.tier;
  const ta = a.publishedAt ? Date.parse(a.publishedAt) : Infinity;
  const tb = b.publishedAt ? Date.parse(b.publishedAt) : Infinity;
  return ta - tb;
}

function merge(group: Candidate[]): Candidate {
  const [primary, ...rest] = [...group].sort(byPrimaryPreference) as [Candidate, ...Candidate[]];
  const supporting = new Map(primary.supporting.map((s) => [s.url, s]));
  for (const c of rest) {
    for (const s of [{ sourceId: c.sourceId, url: c.url, tier: c.tier }, ...c.supporting]) {
      if (s.url !== primary.url && !supporting.has(s.url)) supporting.set(s.url, s);
    }
  }
  const knownDates = group
    .map((c) => c.publishedAt)
    .filter((d): d is string => d !== null)
    .sort();
  return {
    ...primary,
    publishedAt: primary.publishedAt ?? knownDates[0] ?? null,
    domains: [...new Set(group.flatMap((c) => c.domains))],
    supporting: [...supporting.values()],
    severity: primary.severity ?? rest.find((c) => c.severity)?.severity,
  };
}

/** FR-007: merge candidates describing the same development. */
export function dedupe(candidates: Candidate[]): { candidates: Candidate[]; dropped: number } {
  const groups: Candidate[][] = [];
  for (const c of candidates) {
    const group = groups.find((g) => g.some((member) => isSameStory(member, c)));
    if (group) group.push(c);
    else groups.push([c]);
  }
  const merged = groups.map((g) => (g.length === 1 ? g[0]! : merge(g)));
  return { candidates: merged, dropped: candidates.length - merged.length };
}
