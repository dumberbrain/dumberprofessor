import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { searchItems } from '../../src/store/search.js';
import { tempDir } from '../helpers.js';
import { seedReport } from '../store-helpers.js';

beforeEach(async () => {
  process.env.FP_DATA_DIR = tempDir();
  await seedReport('2026-10-27');
  await seedReport('2026-10-29');
});
afterEach(() => {
  delete process.env.FP_DATA_DIR;
});

describe('searchItems', () => {
  it('matches keywords in title, summary and technologies case-insensitively', async () => {
    const byTech = await searchItems({ q: 'llm models' });
    expect(byTech.map((i) => i.candidateId)).toEqual(['aaaaaaaaaaa3', 'aaaaaaaaaaa3']);
    expect((await searchItems({ q: 'CANDIDATE 1' })).length).toBe(2);
    expect((await searchItems({ q: 'xülasə' })).length).toBe(6);
  });

  it('filters by inclusive date range and attaches the report date', async () => {
    const items = await searchItems({ from: '2026-10-28', to: '2026-10-29' });
    expect(items).toHaveLength(3);
    expect(new Set(items.map((i) => i.reportDate))).toEqual(new Set(['2026-10-29']));
    expect(await searchItems({ from: '2026-10-27', to: '2026-10-27' })).toHaveLength(3);
  });

  it('filters by category and domain', async () => {
    expect(await searchItems({ domain: 'ai-llm' })).toHaveLength(2);
    expect(await searchItems({ category: 'security-advisory' })).toHaveLength(0);
    expect(await searchItems({ category: 'release', from: '2026-10-29' })).toHaveLength(3);
  });

  it('returns newest reports first', async () => {
    const items = await searchItems({ q: 'candidate 1' });
    expect(items.map((i) => i.reportDate)).toEqual(['2026-10-29', '2026-10-27']);
  });
});
