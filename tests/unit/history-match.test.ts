import { describe, expect, it } from 'vitest';
import { matchHistory } from '../../src/pipeline/history-match.js';
import type { IndexedItem } from '../../src/schemas/report.js';
import { makeCandidate } from '../helpers.js';

const now = new Date('2026-10-29T04:00:00Z');

function indexed(itemId: string, reportDate: string, title: string, canonicalUrl: string): IndexedItem {
  return {
    itemId,
    rank: 1,
    reportDate,
    canonicalUrl,
    candidateId: 'cccccccccccc',
    title,
    summaryAz: 's',
    whyItMattersAz: 'w',
    implicationsAz: 'i',
    category: 'release',
    domains: ['frontend'],
    technologies: ['React'],
    primarySource: { url: canonicalUrl, name: 'n', tier: 1 },
    publishedAt: null,
    discoveredAt: '2026-10-01T00:00:00Z',
    claims: [],
    facts: [],
    interpretation: [],
    predictions: [],
  };
}

const index = [
  indexed('2026-10-20-1', '2026-10-20', 'React Compiler beta', 'https://react.dev/blog/compiler'),
  indexed('2026-10-25-2', '2026-10-25', 'Next.js 16.1 released', 'https://nextjs.org/blog/16-1'),
  indexed('2026-07-01-1', '2026-07-01', 'Vite 8.0 is out', 'https://vite.dev/blog/8'),
];

describe('matchHistory', () => {
  it('matches the same canonical URL', () => {
    const [c] = matchHistory(
      [makeCandidate({ url: 'https://www.react.dev/blog/compiler?utm_source=x', title: 'Totally different' })],
      index,
      now,
    );
    expect(c!.possibleUpdateOf).toBe('2026-10-20-1');
  });

  it('matches the same product and version', () => {
    const [c] = matchHistory(
      [makeCandidate({ url: 'https://example.com/a', title: 'Deep dive: Next.js 16.1 caching' })],
      index,
      now,
    );
    expect(c!.possibleUpdateOf).toBe('2026-10-25-2');
  });

  it('matches similar titles', () => {
    const [c] = matchHistory(
      [makeCandidate({ url: 'https://example.com/b', title: 'React Compiler beta feedback' })],
      index,
      now,
    );
    expect(c!.possibleUpdateOf).toBe('2026-10-20-1');
  });

  it('ignores items older than 90 days', () => {
    const [c] = matchHistory([makeCandidate({ url: 'https://vite.dev/blog/8', title: 'Vite 8.0 is out' })], index, now);
    expect(c!.possibleUpdateOf).toBeUndefined();
  });

  it('leaves unrelated candidates alone and prefers the most recent match', () => {
    const twice = [
      ...index,
      indexed('2026-10-28-1', '2026-10-28', 'React Compiler beta 2', 'https://react.dev/blog/compiler'),
    ];
    const [a, b] = matchHistory(
      [
        makeCandidate({ url: 'https://react.dev/blog/compiler' }),
        makeCandidate({ url: 'https://pg.example/x', title: 'Postgres internals' }),
      ],
      twice,
      now,
    );
    expect(a!.possibleUpdateOf).toBe('2026-10-28-1');
    expect(b!.possibleUpdateOf).toBeUndefined();
  });
});
