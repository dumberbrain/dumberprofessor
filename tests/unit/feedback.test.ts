import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getFeedback, rateReport } from '../../src/store/feedback.js';
import { run } from '../../src/cli/index.js';
import { tempDir } from '../helpers.js';
import { seedReport } from '../store-helpers.js';

beforeEach(async () => {
  process.env.FP_DATA_DIR = tempDir();
  await seedReport('2026-10-29');
});
afterEach(() => {
  delete process.env.FP_DATA_DIR;
});

const at = '2026-10-29T20:00:00+04:00';

describe('feedback', () => {
  it('stores a rating with an optional comment', async () => {
    await rateReport('2026-10-29', 5, 'faydalı', at);
    expect(await getFeedback('2026-10-29')).toEqual({
      reportDate: '2026-10-29',
      rating: 5,
      comment: 'faydalı',
      ratedAt: at,
    });
  });

  it('re-rating replaces the previous entry', async () => {
    await rateReport('2026-10-29', 2, undefined, at);
    await rateReport('2026-10-29', 4, undefined, at);
    expect((await getFeedback('2026-10-29'))?.rating).toBe(4);
  });

  it('rejects ratings outside 1–5 and comments over 500 characters', async () => {
    await expect(rateReport('2026-10-29', 0, undefined, at)).rejects.toThrow();
    await expect(rateReport('2026-10-29', 6, undefined, at)).rejects.toThrow();
    await expect(rateReport('2026-10-29', 3, 'x'.repeat(501), at)).rejects.toThrow();
  });

  it('rejects a report date that does not exist', async () => {
    await expect(rateReport('2026-01-01', 3, undefined, at)).rejects.toThrow(/no report/);
  });

  it('is available through fp rate', async () => {
    const res = await run(['rate', '2026-10-29', '3', '--comment', 'orta']);
    expect(res.exitCode).toBe(0);
    expect((await getFeedback('2026-10-29'))?.comment).toBe('orta');
    expect((await run(['rate', '2026-10-29', 'nine'])).exitCode).toBe(1);
  });
});
