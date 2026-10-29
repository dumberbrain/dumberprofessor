import type { FetchLike } from '../../lib/http.js';
import type { Candidate, ReportingWindow, Transcript } from '../../schemas/candidate.js';
import type { Source } from '../../schemas/config.js';
import { candidateIdFor, canonicalUrl } from '../../pipeline/canonical-url.js';
import { EXCERPT_MAX } from '../../schemas/candidate.js';

export type TranscriptFetcher = (videoUrl: string) => Promise<Transcript>;

export interface AdapterContext {
  fetchImpl?: FetchLike;
  window: ReportingWindow;
  /** Collection time, recorded on every candidate (FR-002). */
  discoveredAt: string;
  transcripts?: TranscriptFetcher;
}

export type Adapter = (source: Source, ctx: AdapterContext) => Promise<Candidate[]>;

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** HTML → plain text, collapsed whitespace, truncated. Content stays untrusted data. */
export function toPlainText(html: unknown, max = EXCERPT_MAX): string {
  if (html === undefined || html === null) return '';
  const text = String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const code = e[1]?.toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? text.slice(0, max) : text;
}

export function baseCandidate(
  source: Source,
  ctx: AdapterContext,
  fields: { title: string; url: string; publishedAt: string | null; excerpt?: unknown },
): Candidate {
  const canonical = canonicalUrl(fields.url);
  return {
    candidateId: candidateIdFor(canonical),
    title: toPlainText(fields.title, 500),
    url: fields.url,
    canonicalUrl: canonical,
    sourceId: source.id,
    tier: source.tier,
    domains: source.domains,
    publishedAt: fields.publishedAt,
    discoveredAt: ctx.discoveredAt,
    excerpt: toPlainText(fields.excerpt),
    supporting: [],
    score: 0,
  };
}
