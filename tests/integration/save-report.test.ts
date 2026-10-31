import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { run } from '../../src/cli/index.js';
import { RunEnvelope } from '../../src/schemas/candidate.js';
import { listFollowUps } from '../../src/store/followups.js';
import { getReport } from '../../src/store/reports.js';
import { writeRun, writeRunLog } from '../../src/store/runs.js';
import { fixture, tempDir } from '../helpers.js';

const load = (name: string) => JSON.parse(readFileSync(fixture('drafts', name), 'utf8'));

let dir: string;
beforeEach(async () => {
  dir = tempDir();
  process.env.FP_DATA_DIR = dir;
  const r = RunEnvelope.parse(load('run-candidates.json'));
  await writeRun(r);
  await writeRunLog({ runId: r.runId, trigger: 'on-demand', startedAt: r.window.end, status: 'running' });
});
afterEach(() => {
  delete process.env.FP_DATA_DIR;
});

async function draftFile(draft: unknown, name = 'draft.json') {
  const path = join(dir, name);
  await writeFile(path, JSON.stringify(draft));
  return path;
}

describe('fp save-report', () => {
  it('stores a valid draft once, refuses to overwrite, and accepts an addendum', async () => {
    const draft = load('valid-basic.json');
    draft.newFollowUps = [{ candidateId: 'aaaaaaaaaaa1', reasonAz: 'stable buraxılışı izlə' }];
    const path = await draftFile(draft);

    const first = await run(['save-report', path, '--json']);
    expect(first.exitCode).toBe(0);
    expect(JSON.parse(first.stdout)).toMatchObject({ kind: 'report', items: 3 });

    const second = await run(['save-report', path]);
    expect(second.exitCode).toBe(3);

    const late = {
      ...load('valid-few-items.json'),
      items: [load('valid-basic.json').items[1]],
      knowledgeCheck: { questionAz: 'Sual?', relatedCandidateId: 'aaaaaaaaaaa2' },
    };
    const appended = await run(['save-report', await draftFile(late, 'late.json'), '--append', '--json']);
    expect(appended.exitCode).toBe(0);
    expect(JSON.parse(appended.stdout).kind).toBe('addendum');

    const stored = await getReport('2026-10-29');
    expect(stored!.report.items).toHaveLength(3);
    expect(stored!.addenda).toHaveLength(1);
    expect(stored!.report.quality).toMatchObject({
      itemCount: 3,
      duplicatesRemoved: 1,
      droppedAsOld: 2,
      vendorReportedCount: 1,
    });

    const [followUp] = await listFollowUps('open');
    expect(followUp).toMatchObject({ originItemId: '2026-10-29-1', reasonAz: 'stable buraxılışı izlə' });

    const shown = await run(['show', '2026-10-29']);
    expect(shown.stdout).toContain('Gec əlavələr #1');
    expect(shown.stdout).toContain('🏷 istehsalçının iddiası');
  });

  it('rejects an invalid draft with JSON-path errors and stores nothing', async () => {
    const res = await run(['save-report', await draftFile(load('invalid-unknown-candidate.json')), '--json']);
    expect(res.exitCode).toBe(1);
    const err = JSON.parse(res.stderr);
    expect(err.details.some((d: string) => d.startsWith('items.0.candidateId'))).toBe(true);
    expect(await getReport('2026-10-29')).toBeNull();
  });
});
