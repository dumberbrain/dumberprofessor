import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Candidate } from '../src/schemas/candidate.js';
import type { Source } from '../src/schemas/config.js';
import { candidateIdFor, canonicalUrl } from '../src/pipeline/canonical-url.js';

export function makeCandidate(overrides: Partial<Candidate> & { url?: string } = {}): Candidate {
  const url = overrides.url ?? 'https://example.com/post';
  const canonical = canonicalUrl(url);
  return {
    candidateId: candidateIdFor(canonical),
    title: 'Some title',
    url,
    canonicalUrl: canonical,
    sourceId: 'src',
    tier: 1,
    domains: ['frontend'],
    publishedAt: '2026-10-28T10:00:00.000Z',
    discoveredAt: '2026-10-29T08:00:00+04:00',
    excerpt: '',
    supporting: [],
    score: 0,
    ...overrides,
  };
}

export function makeSource(overrides: Partial<Source> = {}): Source {
  return {
    id: 'src',
    name: 'Source',
    type: 'rss',
    url: 'https://example.com/feed.xml',
    tier: 1,
    domains: ['frontend'],
    purpose: 'p',
    updateFrequency: 'f',
    reliability: 'r',
    limitations: 'l',
    failureBehavior: 'b',
    enabled: true,
    ...overrides,
  };
}

export function tempDir(prefix = 'fp-test-'): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

export const fixture = (...parts: string[]) => join(import.meta.dirname, 'fixtures', ...parts);

/** fetch stub: maps URL substrings to [status, body]. */
export function stubFetch(routes: Record<string, [number, string]>) {
  const calls: string[] = [];
  const fn = async (input: string) => {
    calls.push(input);
    const key = Object.keys(routes).find((k) => input.includes(k));
    if (!key) return new Response('not found', { status: 404 });
    const [status, body] = routes[key]!;
    return new Response(body, { status });
  };
  return Object.assign(fn, { calls });
}
