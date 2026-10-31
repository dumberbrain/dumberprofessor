import { describe, expect, it } from 'vitest';
import { dedupe, productVersionKey, titleSimilarity } from '../../src/pipeline/dedupe.js';
import { makeCandidate } from '../helpers.js';

describe('productVersionKey', () => {
  it('extracts product and dotted version', () => {
    expect(productVersionKey('Next.js 16.1 is out')).toBe('next.js@16.1');
    expect(productVersionKey('Announcing TypeScript v6.0 RC')).toBe('typescript@6.0');
  });

  it('ignores numbers without a dotted version', () => {
    expect(productVersionKey('Top 10 CSS tricks')).toBeNull();
  });
});

describe('titleSimilarity', () => {
  it('is high for near-identical titles', () => {
    expect(
      titleSimilarity('React Compiler reaches stable release', 'React Compiler stable release'),
    ).toBeGreaterThanOrEqual(0.6);
  });
  it('is low for unrelated titles', () => {
    expect(titleSimilarity('React Compiler stable', 'Postgres replication internals')).toBeLessThan(0.6);
  });
});

describe('dedupe', () => {
  it('merges the same canonical URL and keeps the highest tier as primary', () => {
    const official = makeCandidate({ url: 'https://react.dev/blog/x', sourceId: 'react-blog', tier: 1 });
    const hn = makeCandidate({ url: 'https://www.react.dev/blog/x/?utm_source=hn', sourceId: 'hacker-news', tier: 3 });
    const { candidates, dropped } = dedupe([hn, official]);
    expect(dropped).toBe(1);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]!.sourceId).toBe('react-blog');
    expect(candidates[0]!.supporting).toEqual([{ sourceId: 'hacker-news', url: hn.url, tier: 3 }]);
  });

  it('merges the same product and version from different URLs', () => {
    const a = makeCandidate({
      url: 'https://nextjs.org/blog/next-16-1',
      title: 'Next.js 16.1',
      tier: 1,
      sourceId: 'nextjs-blog',
    });
    const b = makeCandidate({
      url: 'https://example.com/next',
      title: 'What is new in Next.js 16.1',
      tier: 2,
      sourceId: 'blog',
    });
    expect(dedupe([a, b]).candidates).toHaveLength(1);
  });

  it('merges titles with Jaccard similarity of at least 0.6', () => {
    const a = makeCandidate({ url: 'https://a.com/1', title: 'React Compiler reaches stable release' });
    const b = makeCandidate({ url: 'https://b.com/2', title: 'React Compiler stable release', tier: 3 });
    expect(dedupe([a, b]).candidates).toHaveLength(1);
  });

  it('keeps unrelated items apart', () => {
    const a = makeCandidate({ url: 'https://a.com/1', title: 'React Compiler stable' });
    const b = makeCandidate({ url: 'https://b.com/2', title: 'Postgres replication internals' });
    expect(dedupe([a, b]).candidates).toHaveLength(2);
  });

  it('fills an unknown publication date from a merged duplicate', () => {
    const a = makeCandidate({ url: 'https://a.com/1', publishedAt: null, tier: 1 });
    const b = makeCandidate({ url: 'https://a.com/1?ref=x', publishedAt: '2026-10-28T09:00:00.000Z', tier: 3 });
    expect(dedupe([a, b]).candidates[0]!.publishedAt).toBe('2026-10-28T09:00:00.000Z');
  });
});
