import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { run } from '../../src/cli/index.js';
import { RunEnvelope } from '../../src/schemas/candidate.js';
import { writeRun, writeRunLog } from '../../src/store/runs.js';
import { fixture, withConfig } from '../helpers.js';
import { seedReport } from '../store-helpers.js';

const load = (name: string) => JSON.parse(readFileSync(fixture('drafts', name), 'utf8'));
const config = (ids: string[]) => ({ domains: ids.map((id) => ({ id, name: id, description: id })) });

let dataDir: string;
beforeEach(() => {
  ({ dataDir } = withConfig(config(['backend', 'ai-llm'])));
});
afterEach(() => {
  delete process.env.FP_DATA_DIR;
});

describe('domains come from configuration', () => {
  it('save-report rejects a draft item whose domain is not configured', async () => {
    const r = RunEnvelope.parse(load('run-candidates.json'));
    await writeRun(r);
    await writeRunLog({ runId: r.runId, trigger: 'on-demand', startedAt: r.window.end, status: 'running' });
    const path = join(dataDir, 'draft.json');
    await writeFile(path, JSON.stringify(load('valid-basic.json')));

    const res = await run(['save-report', path]);
    expect(res.exitCode).toBe(1);
    expect(res.stderr).toContain(
      'items.0.domains.0: domain "frontend" is not configured (configured: backend, ai-llm)',
    );
  });

  it('search finds items stored under a domain that was removed later', async () => {
    await seedReport('2026-10-29');
    const res = await run(['search', '--domain', 'frontend']);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('2026-10-29');
  });

  it('search rejects a domain that is neither configured nor stored', async () => {
    const res = await run(['search', '--domain', 'beckend']);
    expect(res.exitCode).toBe(1);
    expect(res.stderr).toContain('unknown domain "beckend" (did you mean "backend"?)');
  });
});
