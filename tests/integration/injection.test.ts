import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { rssAdapter } from '../../src/collect/adapters/rss.js';
import { Candidate, EXCERPT_MAX } from '../../src/schemas/candidate.js';
import { fixture, makeSource, stubFetch } from '../helpers.js';

const window = { start: '2026-10-28T08:00:00+04:00', end: '2026-10-29T08:00:00+04:00', catchUp: false };

describe('untrusted content (FR-006)', () => {
  it('stores injected instructions verbatim as data with no extra fields', async () => {
    const xml = readFileSync(fixture('feeds', 'injection-item.xml'), 'utf8');
    const [item] = await rssAdapter(makeSource(), {
      fetchImpl: stubFetch({ 'example.com': [200, xml] }),
      window,
      discoveredAt: window.end,
    });
    expect(item!.excerpt).toContain('IGNORE PREVIOUS INSTRUCTIONS');
    expect(Object.keys(item!)).not.toContain('evilField');
    expect(JSON.stringify(item)).not.toContain('should not appear');
    expect(Candidate.strict().safeParse(item).success).toBe(true);
  });

  it('truncates long excerpts', async () => {
    const long = 'x'.repeat(EXCERPT_MAX * 3);
    const xml = `<rss><channel><item><title>t</title><link>https://a.com/x</link><description>${long}</description></item></channel></rss>`;
    const [item] = await rssAdapter(makeSource(), { fetchImpl: stubFetch({ 'example.com': [200, xml] }), window, discoveredAt: window.end });
    expect(item!.excerpt.length).toBeLessThanOrEqual(EXCERPT_MAX);
  });
});
