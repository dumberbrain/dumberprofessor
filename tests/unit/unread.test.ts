import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { run } from '../../src/cli/index.js';
import { recordFailure } from '../../src/store/state.js';
import { writeRunLog } from '../../src/store/runs.js';
import { tempDir } from '../helpers.js';
import { seedReport } from '../store-helpers.js';

beforeEach(() => {
  process.env.FP_DATA_DIR = tempDir();
});
afterEach(() => {
  delete process.env.FP_DATA_DIR;
});

describe('fp unread', () => {
  it('prints nothing when nothing is unread', async () => {
    const res = await run(['unread', '--hook']);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toBe('');
  });

  it('returns an unviewed report once, then marks it viewed', async () => {
    await seedReport('2026-10-29');
    const first = await run(['unread']);
    expect(first.stdout).toContain('Gündəlik hesabat — 2026-10-29');
    const second = await run(['unread']);
    expect(second.stdout).toBe('');
  });

  it('does not repeat a report already opened with fp show', async () => {
    await seedReport('2026-10-28');
    await run(['show', '2026-10-28']);
    expect((await run(['unread'])).stdout).toBe('');
  });

  it('emits valid SessionStart hook JSON with reports and failures', async () => {
    await seedReport('2026-10-29');
    await recordFailure('sched-1', 'claude exited with code 1', '2026-10-30T08:00:00+04:00');
    const res = await run(['unread', '--hook']);
    const payload = JSON.parse(res.stdout);
    expect(payload.hookSpecificOutput.hookEventName).toBe('SessionStart');
    expect(payload.hookSpecificOutput.additionalContext).toContain('2026-10-29');
    expect(payload.hookSpecificOutput.additionalContext).toContain('claude exited with code 1');
    expect((await run(['unread', '--hook'])).stdout).toBe('');
  });

  it('surfaces a failed run exactly once', async () => {
    await writeRunLog({
      runId: 'r1',
      trigger: 'scheduled',
      startedAt: '2026-10-30T08:00:00+04:00',
      status: 'failed',
      error: 'all sources unavailable',
    });
    expect((await run(['unread'])).stdout).toContain('all sources unavailable');
    expect((await run(['unread'])).stdout).toBe('');
  });

  it('record-failure creates or updates the run log', async () => {
    const res = await run(['record-failure', '--run', 'sched-2', '--error', 'boom']);
    expect(res.exitCode).toBe(0);
    expect((await run(['unread'])).stdout).toContain('boom');
  });
});
