import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { rssAdapter } from '../../src/collect/adapters/rss.js';
import { resolveChannelId, youtubeAdapter } from '../../src/collect/adapters/youtube.js';
import { hnAdapter } from '../../src/collect/adapters/hn.js';
import { githubAdvisoriesAdapter } from '../../src/collect/adapters/github-advisories.js';
import type { AdapterContext } from '../../src/collect/adapters/types.js';
import { Candidate } from '../../src/schemas/candidate.js';
import { fixture, makeSource, stubFetch } from '../helpers.js';

const read = (name: string) => readFileSync(fixture('feeds', name), 'utf8');

const window = { start: '2026-10-28T08:00:00+04:00', end: '2026-10-29T08:00:00+04:00', catchUp: false };
const ctx = (routes: Record<string, [number, string]>, extra: Partial<AdapterContext> = {}): AdapterContext => ({
  fetchImpl: stubFetch(routes),
  window,
  discoveredAt: '2026-10-29T08:00:00+04:00',
  ...extra,
});

describe('rss adapter', () => {
  it('normalizes RSS 2.0 items', async () => {
    const source = makeSource({ id: 'react-blog', url: 'https://react.dev/rss.xml' });
    const items = await rssAdapter(source, ctx({ 'react.dev/rss.xml': [200, read('rss-sample.xml')] }));
    expect(items).toHaveLength(3);
    const first = items[0]!;
    expect(Candidate.parse(first)).toBeTruthy();
    expect(first.title).toBe('React 20.1 & the new Compiler');
    expect(first.canonicalUrl).toBe('https://react.dev/blog/2026/10/28/react-20-1');
    expect(first.publishedAt).toBe('2026-10-28T10:00:00.000Z');
    expect(first.excerpt).toBe('React 20.1 ships the stable compiler.');
    expect(first.discoveredAt).toBe('2026-10-29T08:00:00+04:00');
    expect(items[2]!.publishedAt).toBeNull();
  });

  it('normalizes Atom entries, preferring the alternate link and published date', async () => {
    const source = makeSource({ id: 'martin-fowler', tier: 2, domains: ['system-design'] });
    const items = await rssAdapter(source, ctx({ 'example.com/feed.xml': [200, read('atom-sample.xml')] }));
    expect(items.map((i) => i.url)).toEqual([
      'https://martinfowler.com/articles/leader-election.html',
      'https://martinfowler.com/articles/updated-only.html',
    ]);
    expect(items[0]!.publishedAt).toBe('2026-10-28T16:00:00.000Z');
    expect(items[0]!.excerpt).toBe('How nodes agree on a leader.');
    expect(items[1]!.publishedAt).toBe('2026-10-28T09:00:00.000Z');
    expect(items[0]!.domains).toEqual(['system-design']);
  });

  it('throws on HTTP 500 so the source is reported unavailable', async () => {
    await expect(rssAdapter(makeSource(), ctx({ 'example.com': [500, 'boom'] }))).rejects.toThrow(/HTTP 500/);
  });
});

describe('youtube adapter', () => {
  it('resolves a handle to a channel id', async () => {
    const id = await resolveChannelId('https://www.youtube.com/@jherr', stubFetch({ '@jherr': [200, read('youtube-handle-page.html')] }));
    expect(id).toBe('UCtestchannel0000000000a');
  });

  it('lists videos and fetches transcripts only for videos inside the window', async () => {
    const source = makeSource({ id: 'yt-jherr', type: 'youtube', url: 'https://www.youtube.com/@jherr', channelId: 'UCtestchannel0000000000a', tier: 4 });
    const fetched: string[] = [];
    const items = await youtubeAdapter(
      source,
      ctx(
        { 'feeds/videos.xml?channel_id=UCtestchannel0000000000a': [200, read('youtube-channel.xml')] },
        {
          transcripts: async (url) => {
            fetched.push(url);
            return { status: 'ok', language: 'en', segments: [{ t: 0, text: 'hello' }] };
          },
        },
      ),
    );
    expect(items).toHaveLength(2);
    expect(items[0]!.url).toBe('https://www.youtube.com/watch?v=abc123def45');
    expect(items[0]!.excerpt).toBe('Deep dive into RSC caching.');
    expect(items[0]!.video).toEqual({ channel: 'Jack Herrington', transcript: { status: 'ok', language: 'en', segments: [{ t: 0, text: 'hello' }] } });
    expect(items[1]!.video!.transcript.status).toBe('unavailable');
    expect(fetched).toEqual(['https://www.youtube.com/watch?v=abc123def45']);
  });

  it('fails clearly when the channel id was never resolved', async () => {
    const source = makeSource({ type: 'youtube', url: 'https://www.youtube.com/@x', channelId: null });
    await expect(youtubeAdapter(source, ctx({}))).rejects.toThrow(/sources resolve/);
  });
});

describe('hacker news adapter', () => {
  it('queries from the window start and links self posts to the discussion', async () => {
    const fetchImpl = stubFetch({ 'hn.algolia.com': [200, read('hn-search.json')] });
    const source = makeSource({ id: 'hacker-news', type: 'hn', url: 'https://hn.algolia.com/api/v1/search_by_date', tier: 3, params: { minPoints: 100 } });
    const items = await hnAdapter(source, { ...ctx({}), fetchImpl });
    expect(fetchImpl.calls[0]).toContain('numericFilters=created_at_i%3E%3D1793160000%2Cpoints%3E%3D100');
    expect(items[0]!.url).toBe('https://example.dev/css-parser');
    expect(items[0]!.tier).toBe(3);
    expect(items[0]!.supporting).toEqual([{ sourceId: 'hacker-news', url: 'https://news.ycombinator.com/item?id=41000001', tier: 3 }]);
    expect(items[1]!.url).toBe('https://news.ycombinator.com/item?id=41000002');
    expect(items[1]!.publishedAt).toBe('2026-10-28T09:00:00.000Z');
  });
});

describe('github advisories adapter', () => {
  it('maps advisories with severity and package names', async () => {
    const fetchImpl = stubFetch({ 'api.github.com/advisories': [200, read('advisories.json')] });
    const source = makeSource({
      id: 'npm-advisories',
      type: 'github-advisories',
      url: 'https://api.github.com/advisories',
      domains: ['security', 'frontend'],
      params: { ecosystem: 'npm', severity: ['critical'] },
    });
    const items = await githubAdvisoriesAdapter(source, { ...ctx({}), fetchImpl });
    expect(fetchImpl.calls[0]).toContain('ecosystem=npm');
    expect(fetchImpl.calls[0]).toContain('severity=critical');
    expect(fetchImpl.calls[0]).toContain('published=%3E%3D2026-10-28');
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: 'Prototype pollution in example-lib (CVE-2026-12345; example-lib)',
      url: 'https://github.com/advisories/GHSA-xxxx-yyyy-zzzz',
      severity: 'critical',
      publishedAt: '2026-10-28T11:00:00.000Z',
    });
  });
});
