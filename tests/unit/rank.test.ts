import { describe, expect, it } from 'vitest';
import { rank, scoreCandidate } from '../../src/pipeline/rank.js';
import { makeCandidate } from '../helpers.js';

const profile = {
  priorityTechnologies: ['React', 'TypeScript', 'CSS'],
  ignoredTopics: ['crypto'],
  updatedAt: '2026-10-29',
};

describe('scoreCandidate', () => {
  it('weights tiers 4/3/2/2 and adds the domain bonus', () => {
    const base = { title: 'Unrelated news', url: 'https://x.com/a' };
    expect(scoreCandidate(makeCandidate({ ...base, tier: 1 }), profile)).toBe(4 + 3);
    expect(scoreCandidate(makeCandidate({ ...base, tier: 2 }), profile)).toBe(3 + 3);
    expect(scoreCandidate(makeCandidate({ ...base, tier: 3 }), profile)).toBe(2 + 3);
    expect(scoreCandidate(makeCandidate({ ...base, tier: 4 }), profile)).toBe(2 + 3);
  });

  it('gives earlier priority technologies more weight, matching whole words', () => {
    const react = scoreCandidate(makeCandidate({ title: 'React 20 released' }), profile);
    const css = scoreCandidate(makeCandidate({ title: 'CSS anchor positioning' }), profile);
    const reactive = scoreCandidate(makeCandidate({ title: 'Reactive streams' }), profile);
    expect(react).toBe(7 + 5);
    expect(css).toBe(7 + 4);
    expect(reactive).toBe(7);
  });

  it('adds severity bonuses', () => {
    expect(scoreCandidate(makeCandidate({ title: 'pkg vuln', severity: 'critical' }), profile)).toBe(7 + 4);
    expect(scoreCandidate(makeCandidate({ title: 'pkg vuln', severity: 'high' }), profile)).toBe(7 + 2);
  });
});

describe('rank', () => {
  it('sorts by score descending', () => {
    const a = makeCandidate({ url: 'https://a.com', title: 'Postgres' });
    const b = makeCandidate({ url: 'https://b.com', title: 'React news' });
    expect(rank([a, b], profile).candidates.map((c) => c.url)).toEqual(['https://b.com', 'https://a.com']);
  });

  it('drops items matching only ignored topics but keeps security advisories', () => {
    const ignored = makeCandidate({ url: 'https://a.com', title: 'crypto wallet launch' });
    const advisory = makeCandidate({ url: 'https://b.com', title: 'crypto lib RCE', severity: 'high' });
    const mixed = makeCandidate({ url: 'https://c.com', title: 'React crypto helpers' });
    const result = rank([ignored, advisory, mixed], profile);
    expect(result.dropped).toBe(1);
    expect(result.candidates.map((c) => c.url).sort()).toEqual(['https://b.com', 'https://c.com']);
  });
});

describe('rank with focus', () => {
  const focus = ['security', 'backend'];

  it('adds +4 for the first focus domain and +3 for the second', () => {
    const base = scoreCandidate(makeCandidate({ title: 'Unrelated news', domains: ['frontend'] }), profile);
    expect(scoreCandidate(makeCandidate({ title: 'Unrelated news', domains: ['security'] }), profile, focus)).toBe(
      base + 4,
    );
    expect(scoreCandidate(makeCandidate({ title: 'Unrelated news', domains: ['backend'] }), profile, focus)).toBe(
      base + 3,
    );
    expect(
      scoreCandidate(makeCandidate({ title: 'Unrelated news', domains: ['frontend', 'security'] }), profile, focus),
    ).toBe(base + 4);
  });

  it('marks non-focus items, never security advisories, and nothing without a focus', () => {
    const items = () => [
      makeCandidate({ title: 'A', url: 'https://x.com/a', domains: ['security'] }),
      makeCandidate({ title: 'B', url: 'https://x.com/b', domains: ['frontend'] }),
      makeCandidate({ title: 'C', url: 'https://x.com/c', domains: ['frontend'], severity: 'high' }),
    ];
    const focused = rank(items(), profile, focus).candidates;
    expect(Object.fromEntries(focused.map((c) => [c.title, c.outsideFocus]))).toEqual({
      A: undefined,
      B: true,
      C: undefined,
    });
    expect(focused[0]!.title).toBe('A');
    expect(rank(items(), profile).candidates.some((c) => c.outsideFocus)).toBe(false);
  });
});
