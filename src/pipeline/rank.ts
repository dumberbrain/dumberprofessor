import type { Candidate } from '../schemas/candidate.js';
import type { InterestProfile } from '../schemas/config.js';
import { containsTerm } from './text.js';

const TIER_WEIGHT = { 1: 4, 2: 3, 3: 2, 4: 2 } as const;
const DOMAIN_BONUS = 3;
const SEVERITY_BONUS: Partial<Record<NonNullable<Candidate['severity']>, number>> = { critical: 4, high: 2 };

const textOf = (c: Candidate) => `${c.title} ${c.excerpt}`;

/** +5 for the first priority technology, 0.5 less per position, never below 1. */
function priorityBonus(text: string, profile: InterestProfile): number {
  let best = 0;
  profile.priorityTechnologies.forEach((tech, i) => {
    if (containsTerm(text, tech)) best = Math.max(best, Math.max(5 - i * 0.5, 1));
  });
  return best;
}

/** Principle IX: +4 for the first focus domain, 1 less per position, never below 1. */
function focusBonus(c: Candidate, focus: string[]): number {
  const positions = c.domains.map((d) => focus.indexOf(d)).filter((i) => i >= 0);
  return positions.length ? Math.max(4 - Math.min(...positions), 1) : 0;
}

/** Transparent ranking score (001 research.md R7, 002 research.md R6). */
export function scoreCandidate(c: Candidate, profile: InterestProfile, focus: string[] = []): number {
  const text = textOf(c);
  return (
    TIER_WEIGHT[c.tier] +
    (c.domains.length > 0 ? DOMAIN_BONUS : 0) +
    priorityBonus(text, profile) +
    focusBonus(c, focus) +
    (c.severity ? (SEVERITY_BONUS[c.severity] ?? 0) : 0)
  );
}

/** FR-013a: items matching only ignored topics are dropped unless they are security advisories. */
function isIgnored(c: Candidate, profile: InterestProfile): boolean {
  if (c.severity) return false;
  const text = textOf(c);
  const ignored = profile.ignoredTopics.some((t) => containsTerm(text, t));
  return ignored && priorityBonus(text, profile) === 0;
}

export function rank(
  candidates: Candidate[],
  profile: InterestProfile,
  focus: string[] = [],
): { candidates: Candidate[]; dropped: number } {
  const kept = candidates.filter((c) => !isIgnored(c, profile));
  const scored = kept.map((c) => {
    Object.assign(c, { score: scoreCandidate(c, profile, focus) });
    // Security advisories are never "outside the focus": they are always relevant.
    if (focus.length > 0 && !c.severity && focusBonus(c, focus) === 0) c.outsideFocus = true;
    return c;
  });
  scored.sort((a, b) => b.score - a.score);
  return { candidates: scored, dropped: candidates.length - kept.length };
}
