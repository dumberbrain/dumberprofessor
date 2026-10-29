import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { collect } from '../../src/collect/collect.js';
import { RunEnvelope } from '../../src/schemas/candidate.js';
import { fixture, makeSource, stubFetch, tempDir } from '../helpers.js';

const read = (name: string) => readFileSync(fixture('feeds', name), 'utf8');

const sources = [
  makeSource({ id: 'react-blog', url: 'https://react.dev/rss.xml' }),
  makeSource({ id: 'hacker-news', type: 'hn', url: 'https://hn.algolia.com/api/v1/search_by_date', tier: 3, params: { minPoints: 100 } }),
  makeSource({ id: 'broken', url: 'https://broken.example/feed.xml' }),
  makeSource({ id: 'github-trending', type: 'web', url: 'https://github.com/trending', tier: 3 }),
  makeSource({ id: 'disabled', url: 'https://disabled.example/feed.xml', enabled: false }),
];

// HN repeats the React post: must be merged into the official item.
const hn = JSON.stringify({
  hits: [
    ...JSON.parse(read('hn-search.json')).hits,
    { objectID: '41000003', title: 'React 20.1 and the new compiler', url: 'https://react.dev/blog/2026/10/28/react-20-1', points: 900, created_at: '2026-10-28T10:30:00Z', created_at_i: 1793183400 },
  ],
});

const profile = { priorityTechnologies: ['React', 'CSS'], ignoredTopics: [], updatedAt: '2026-10-29' };

let dataDir: string;
beforeEach(() => {
  dataDir = tempDir();
  process.env.FP_DATA_DIR = dataDir;
});
afterEach(() => {
  delete process.env.FP_DATA_DIR;
});

describe('collect', () => {
  it('produces a valid run envelope with window, drops, merges and source status', async () => {
    const fetchImpl = stubFetch({
      'react.dev/rss.xml': [200, read('rss-sample.xml')],
      'hn.algolia.com': [200, hn],
      'broken.example': [500, 'down'],
    });
    const run = await collect({
      now: new Date('2026-10-29T04:00:00Z'),
      timeZone: 'Asia/Baku',
      sources,
      profile,
      fetchImpl,
      lastGeneratedAt: null,
    });

    expect(RunEnvelope.parse(run)).toBeTruthy();
    expect(run.window).toEqual({ start: '2026-10-28T08:00:00+04:00', end: '2026-10-29T08:00:00+04:00', catchUp: false });
    expect(run.droppedAsOld).toBe(1);
    expect(run.droppedAsDuplicate).toBe(1);
    expect(run.toVisit.map((s) => s.id)).toEqual(['github-trending']);
    expect(run.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'react-blog', status: 'ok' }),
        expect.objectContaining({ id: 'broken', status: 'unavailable' }),
      ]),
    );
    expect(run.sources.some((s) => s.id === 'disabled')).toBe(false);

    const react = run.candidates.find((c) => c.title.startsWith('React 20.1'))!;
    expect(react.sourceId).toBe('react-blog');
    expect(react.supporting.some((s) => s.sourceId === 'hacker-news')).toBe(true);
    expect(run.candidates[0]).toBe(react); // highest score first
    expect(run.candidates.some((c) => c.publishedAt === null)).toBe(true); // undated kept

    const stored = JSON.parse(await readFile(join(dataDir, 'runs', run.runId, 'candidates.json'), 'utf8'));
    expect(stored.runId).toBe(run.runId);
    const log = JSON.parse(await readFile(join(dataDir, 'runs', run.runId, 'run.json'), 'utf8'));
    expect(log.status).toBe('running');
  });

  it('fails the run when every source is unavailable', async () => {
    await expect(
      collect({
        now: new Date('2026-10-29T04:00:00Z'),
        timeZone: 'Asia/Baku',
        sources: [sources[2]!],
        profile,
        fetchImpl: stubFetch({ 'broken.example': [500, 'down'] }),
        lastGeneratedAt: null,
      }),
    ).rejects.toMatchObject({ exitCode: 2 });
  });
});
