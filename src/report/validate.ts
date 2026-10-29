import { formatIssues } from '../config/load.js';
import { canonicalUrl } from '../pipeline/canonical-url.js';
import type { Candidate, RunEnvelope } from '../schemas/candidate.js';
import type { Source } from '../schemas/config.js';
import { ReportDraft, type DraftItem } from '../schemas/report.js';

export interface ValidationContext {
  sources: Source[];
  /** itemIds in the history index (for updateOf) */
  indexItemIds?: Set<string>;
  /** ids of open follow-ups (for resolvesFollowUp) */
  openFollowUpIds?: Set<string>;
}

export type ValidationResult = { ok: true; draft: ReportDraft } | { ok: false; errors: string[] };

/** Hosts that are discovery or learning sources: never acceptable as verification evidence. */
const NON_EVIDENCE = [
  'news.ycombinator.com',
  'hn.algolia.com',
  'youtube.com',
  'youtu.be',
  'reddit.com',
  'x.com',
  'twitter.com',
  'javascriptweekly.com',
  'frontendfoc.us',
  'github.com/trending',
];

const hostPath = (url: string) => {
  const u = new URL(url);
  return `${u.hostname.replace(/^www\./, '')}${u.pathname}`;
};

function nonEvidencePrefixes(sources: Source[]): string[] {
  const configured = sources
    .filter((s) => s.tier >= 3)
    .map((s) => {
      const u = new URL(s.url);
      // youtube handles: ban the whole host; feeds/APIs: host + path
      return s.type === 'youtube' ? u.hostname.replace(/^www\./, '') : hostPath(s.url).replace(/\/$/, '');
    });
  return [...NON_EVIDENCE, ...configured];
}

/** Bare host entries match the host and its subdomains; host/path entries match by prefix. */
function isNonEvidence(url: string, prefixes: string[]): boolean {
  const hp = hostPath(url);
  const host = hp.split('/')[0]!;
  return prefixes.some((p) => (p.includes('/') ? hp.startsWith(p) : host === p || host.endsWith(`.${p}`)));
}

function validateItem(item: DraftItem, i: number, cand: Candidate, prefixes: string[], errors: string[]): void {
  const at = (field: string) => `items.${i}.${field}`;

  if (item.discoveredAt !== cand.discoveredAt) {
    errors.push(`${at('discoveredAt')}: must equal the collected discovery date ${cand.discoveredAt}`);
  }

  const hasVerifiedDate = item.claims.some((c) => c.type === 'date' && c.status === 'verified');
  if (item.publishedAt !== cand.publishedAt && !hasVerifiedDate) {
    errors.push(`${at('publishedAt')}: differs from the collected date (${cand.publishedAt}) without a verified date claim`);
  }
  if (item.publishedAt === null && item.category === 'breaking') {
    errors.push(`${at('category')}: an item with an unknown publication date cannot be "breaking"`);
  }

  item.claims.forEach((claim, j) => {
    if (claim.evidenceUrl && isNonEvidence(claim.evidenceUrl, prefixes)) {
      errors.push(`items.${i}.claims.${j}.evidenceUrl: discovery or learning sources are not Tier 1 evidence`);
    }
  });

  const traceable = new Set([
    cand.canonicalUrl,
    ...cand.supporting.map((s) => canonicalUrl(s.url)),
    ...item.claims.filter((c) => c.status === 'verified' && c.evidenceUrl).map((c) => canonicalUrl(c.evidenceUrl!)),
  ]);
  if (!traceable.has(canonicalUrl(item.primarySource.url))) {
    errors.push(`${at('primarySource.url')}: must be the collected URL, a supporting source, or verified evidence`);
  }

  if (cand.video) {
    if (!item.video) {
      errors.push(`${at('video')}: required for a video candidate`);
    } else if (cand.video.transcript.status === 'unavailable' && !item.video.notAnalyzed) {
      errors.push(`${at('video.notAnalyzed')}: transcript was unavailable, so the video must be marked not analyzed`);
    }
  }
}

/** FR-008/008a/022: updates, history matches and follow-ups. */
function validateHistory(draft: ReportDraft, run: RunEnvelope, ctx: ValidationContext, errors: string[]): void {
  const indexIds = ctx.indexItemIds ?? new Set<string>();
  const openIds = ctx.openFollowUpIds ?? new Set<string>();
  const excluded = new Set((draft.excludedMatches ?? []).map((m) => m.candidateId));
  const reported = new Map(draft.items.map((item, i) => [item.candidateId, i]));

  draft.items.forEach((item, i) => {
    if (item.updateOf && !indexIds.has(item.updateOf)) {
      errors.push(`items.${i}.updateOf: "${item.updateOf}" is not a previously reported item`);
    }
    if (item.resolvesFollowUp && !openIds.has(item.resolvesFollowUp)) {
      errors.push(`items.${i}.resolvesFollowUp: "${item.resolvesFollowUp}" is not an open follow-up`);
    }
  });

  for (const cand of run.candidates) {
    if (!cand.possibleUpdateOf) continue;
    const i = reported.get(cand.candidateId);
    if (i === undefined) {
      if (!excluded.has(cand.candidateId)) {
        errors.push(`excludedMatches: candidate "${cand.candidateId}" matches ${cand.possibleUpdateOf}; report it as an update or explain its exclusion`);
      }
    } else if (draft.items[i]!.category !== 'update' && !excluded.has(cand.candidateId)) {
      errors.push(`items.${i}.category: candidate matches previously reported ${cand.possibleUpdateOf}; use "update" or list it in excludedMatches as a false match`);
    }
  }

  (draft.newFollowUps ?? []).forEach((f, j) => {
    if (!reported.has(f.candidateId)) errors.push(`newFollowUps.${j}.candidateId: must reference a reported item`);
  });
}

/** Schema + semantic rules of `fp save-report` (contracts/cli.md). */
export function validateDraft(input: unknown, run: RunEnvelope, ctx: ValidationContext): ValidationResult {
  const parsed = ReportDraft.safeParse(input);
  if (!parsed.success) return { ok: false, errors: formatIssues(parsed.error) };
  const draft = parsed.data;
  const errors: string[] = [];

  if (draft.runId !== run.runId) errors.push(`runId: draft belongs to "${draft.runId}", not run "${run.runId}"`);
  const expectedDate = run.window.end.slice(0, 10);
  if (draft.reportDate !== expectedDate) errors.push(`reportDate: must be ${expectedDate} (end of the reporting window)`);

  const candidates = new Map(run.candidates.map((c) => [c.candidateId, c]));
  const prefixes = nonEvidencePrefixes(ctx.sources);
  const seen = new Set<string>();

  draft.items.forEach((item, i) => {
    const cand = candidates.get(item.candidateId);
    if (!cand) {
      errors.push(`items.${i}.candidateId: "${item.candidateId}" was not collected in this run (FR-012)`);
      return;
    }
    if (seen.has(item.candidateId)) {
      errors.push(`items.${i}.candidateId: "${item.candidateId}" is reported more than once`);
      return;
    }
    seen.add(item.candidateId);
    validateItem(item, i, cand, prefixes, errors);
  });

  validateHistory(draft, run, ctx, errors);

  if (draft.items.length < 3 && !draft.fewItemsNote) {
    errors.push('fewItemsNote: required when fewer than 3 items are reported (FR-012)');
  }
  if (!seen.has(draft.knowledgeCheck.relatedCandidateId)) {
    errors.push('knowledgeCheck.relatedCandidateId: must reference a reported item');
  }

  return errors.length ? { ok: false, errors } : { ok: true, draft };
}
