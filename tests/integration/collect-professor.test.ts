import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { collect } from '../../src/collect/collect.js';
import { fixture, stubFetch, withConfig } from '../helpers.js';

const rss = readFileSync(fixture('feeds', 'rss-sample.xml'), 'utf8');

afterEach(() => {
  delete process.env.FP_DATA_DIR;
});

describe('collect from professor.json', () => {
  it('collects only news sources and labels items with configured domains', async () => {
    withConfig({
      focus: ['backend'],
      domains: [
        { id: 'backend', name: 'Backend', description: 'APIs', depth: 'advanced' },
        { id: 'english', name: 'English', description: 'Language', kind: 'language' },
      ],
      sources: [
        {
          id: 'news-feed',
          kind: 'rss',
          url: 'https://news.example/rss.xml',
          tier: 1,
          domains: ['backend'],
          use: ['news'],
        },
        { id: 'lesson-feed', kind: 'rss', url: 'https://lessons.example/rss.xml', tier: 1, domains: ['backend'] },
      ],
      ranking: { priorityTechnologies: ['React'] },
      schedule: { timeZone: 'Asia/Baku' },
    });
    const fetchImpl = stubFetch({ 'news.example': [200, rss], 'lessons.example': [200, rss] });

    const run = await collect({
      now: new Date('2026-10-29T04:00:00Z'),
      fetchImpl,
      lastGeneratedAt: null,
      transcripts: async () => ({ status: 'unavailable', reason: 'test' }),
    });

    expect(fetchImpl.calls.some((u) => u.includes('lessons.example'))).toBe(false);
    expect(run.sources.map((s) => s.id)).toEqual(['news-feed']);
    expect(run.candidates.length).toBeGreaterThan(0);
    expect(run.candidates.every((c) => c.domains.includes('backend'))).toBe(true);
    expect(run.focus).toEqual(['backend']);
    expect(run.depthByDomain).toEqual({ backend: 'advanced', english: 'intermediate' });
  });
});
