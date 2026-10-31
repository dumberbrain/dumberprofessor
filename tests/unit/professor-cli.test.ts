import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { run } from '../../src/cli/index.js';
import { recordFailure } from '../../src/store/state.js';
import { withConfig } from '../helpers.js';
import { seedReport } from '../store-helpers.js';

const config = {
  focus: ['backend'],
  domains: [
    {
      id: 'backend',
      name: 'Backend',
      description: 'APIs and databases',
      depth: 'advanced',
      curriculum: ['Indexes', 'Transactions'],
    },
    { id: 'english', name: 'English', description: 'Language practice', kind: 'language', level: 'B1' },
  ],
  sources: [{ id: 'pg-docs', kind: 'docs', url: 'https://www.postgresql.org/docs/', tier: 1, domains: ['backend'] }],
  lesson: { quizQuestions: 2, questionTypes: ['conceptual', 'debugging', 'grammar'] },
};

let configDir: string;
const write = (value: unknown) => writeFileSync(join(configDir, 'professor.json'), JSON.stringify(value, null, 2));
const read = () => JSON.parse(readFileSync(join(configDir, 'professor.json'), 'utf8'));

beforeEach(() => {
  ({ configDir } = withConfig(config));
});
afterEach(() => {
  delete process.env.FP_DATA_DIR;
});

describe('fp config check', () => {
  it('reports unknown domain references with a suggestion', async () => {
    write({ ...config, sources: [{ ...config.sources[0], domains: ['beckend'] }] });
    const res = await run(['config', 'check']);
    expect(res.exitCode).toBe(1);
    expect(res.stderr).toContain('sources.0.domains.0: unknown domain "beckend" (did you mean "backend"?)');
  });

  it('reports invalid JSON', async () => {
    writeFileSync(join(configDir, 'professor.json'), '{ "domains": [ }');
    expect((await run(['config', 'check'])).exitCode).toBe(1);
  });
});

describe('fp focus', () => {
  it('sets focus and keeps the rest of the file as written', async () => {
    const res = await run(['focus', 'set', 'english', 'backend']);
    expect(res.stdout).toContain('focus: english, backend');
    expect(read()).toEqual({ ...config, focus: ['english', 'backend'] });
  });

  it('rejects an unknown domain without changing the file', async () => {
    expect((await run(['focus', 'set', 'beckend'])).exitCode).toBe(1);
    expect(read().focus).toEqual(['backend']);
  });

  it('clears focus', async () => {
    await run(['focus', 'clear']);
    expect(read().focus).toEqual([]);
  });
});

describe('fp learn', () => {
  it('gives lesson context for the first focus domain', async () => {
    const res = await run(['learn', 'context']);
    expect(res.stdout).toContain('domain: backend (Backend) · kind technical · depth advanced');
    expect(res.stdout).toContain('next curriculum topic: Indexes (1/2)');
    expect(res.stdout).toContain('types conceptual, debugging (skipped for this domain: grammar)');
    expect(res.stdout).toContain('- pg-docs docs T1 https://www.postgresql.org/docs/');
  });

  it('moves through start → record → due', async () => {
    await run(['learn', 'start', '--domain', 'backend', '--topic', 'Indexes', '--date', '2026-10-01']);
    let ctx = await run(['learn', 'context', '--date', '2026-10-01']);
    expect(ctx.stdout).toContain('in progress: Indexes');
    expect(ctx.stdout).toContain('next curriculum topic: Transactions (2/2)');

    const rec = await run([
      'learn',
      'record',
      '--domain',
      'backend',
      '--topic',
      'Indexes',
      '--score',
      '1',
      '--total',
      '2',
      '--misconceptions',
      'index on every column; order does not matter',
      '--date',
      '2026-10-01',
    ]);
    expect(rec.stdout).toContain('backend/Indexes: 1/2 · learning · confidence low · next review 2026-10-02');

    expect((await run(['learn', 'due', '--date', '2026-10-01'])).exitCode).toBe(2);
    const due = await run(['learn', 'due', '--date', '2026-10-02']);
    expect(due.stdout).toContain(
      'backend · Indexes · due 2026-10-02 · last 1/2 · misconceptions: index on every column | order does not matter',
    );
  });

  it('stores prerequisites and objectives of a topic', async () => {
    await run([
      'learn',
      'start',
      '--domain',
      'backend',
      '--topic',
      'Indexes',
      '--prerequisites',
      'SQL basics; B-trees',
      '--objectives',
      'choose an index',
    ]);
    const [entry] = JSON.parse((await run(['learn', 'status', '--json'])).stdout);
    expect(entry).toMatchObject({ prerequisites: ['SQL basics', 'B-trees'], objectives: ['choose an index'] });
  });

  it('rejects a score above the total', async () => {
    const res = await run(['learn', 'record', '--domain', 'backend', '--topic', 'X', '--score', '3', '--total', '2']);
    expect(res.exitCode).toBe(1);
  });
});

describe('fp session-start', () => {
  it('emits a short ask instruction as hook JSON', async () => {
    const res = await run(['session-start', '--hook']);
    const ctx = JSON.parse(res.stdout).hookSpecificOutput.additionalContext as string;
    expect(ctx).toContain('ask the user what they want');
    expect(ctx).toContain('state: unread reports 0 · due reviews 0');
    expect(ctx.length).toBeLessThan(400);
  });

  it('counts unread reports, failed scheduled runs and lessons in progress', async () => {
    await seedReport('2026-10-29');
    await recordFailure('sched-1', 'claude exited with code 1', '2026-10-30T08:00:00+04:00');
    await run(['learn', 'start', '--domain', 'backend', '--topic', 'Indexes']);
    const out = (await run(['session-start'])).stdout;
    expect(out).toContain(
      'state: unread reports 1 · failed scheduled runs 1 · due reviews 0 · lesson in progress: backend/Indexes',
    );
    // counting must not consume them: the news action still shows the report
    expect((await run(['session-start'])).stdout).toContain('unread reports 1');
  });

  it('lists enabled actions in actions mode', async () => {
    write({
      ...config,
      sessionStart: {
        mode: 'actions',
        actions: [{ type: 'review' }, { type: 'news', enabled: false }, { type: 'lesson' }],
      },
    });
    expect((await run(['session-start'])).stdout).toContain('run in order: review, lesson.');
  });

  it('prints nothing when off', async () => {
    write({ ...config, sessionStart: { mode: 'off' } });
    expect((await run(['session-start', '--hook'])).stdout).toBe('');
  });

  it('shows config errors instead of running anything', async () => {
    write({ ...config, focus: ['nope'] });
    const res = await run(['session-start']);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('config/professor.json is invalid');
    expect(res.stdout).toContain('focus.0: unknown domain "nope"');
  });
});
