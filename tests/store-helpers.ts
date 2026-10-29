import { readFileSync } from 'node:fs';
import { RunEnvelope } from '../src/schemas/candidate.js';
import { ReportDraft } from '../src/schemas/report.js';
import { saveReport } from '../src/store/reports.js';
import { writeRun, writeRunLog } from '../src/store/runs.js';
import { fixture } from './helpers.js';

const load = (name: string) => JSON.parse(readFileSync(fixture('drafts', name), 'utf8'));

/** Stores the fixture run and a report for `reportDate` in the current FP_DATA_DIR. */
export async function seedReport(reportDate = '2026-10-29', runId = `run-${reportDate}`) {
  const run = RunEnvelope.parse({
    ...load('run-candidates.json'),
    runId,
    window: { start: `${reportDate}T00:00:00+04:00`, end: `${reportDate}T08:00:00+04:00`, catchUp: false },
  });
  await writeRun(run);
  await writeRunLog({ runId, trigger: 'on-demand', startedAt: `${reportDate}T08:00:00+04:00`, status: 'running' });
  const draft = ReportDraft.parse({ ...load('valid-basic.json'), runId, reportDate });
  return saveReport(draft, run, { generatedAt: `${reportDate}T08:05:00+04:00` });
}
