import { State, type RunLog } from '../schemas/state.js';
import { dataPath, readJsonOr, writeJsonAtomic } from './fs.js';
import { listReportDates } from './reports.js';
import { listRunLogs, readRunLog, writeRunLog } from './runs.js';

const statePath = () => dataPath('state.json');

async function readState(): Promise<State> {
  return readJsonOr(statePath(), State, { viewed: {} });
}

export async function markViewed(reportDate: string, at: string): Promise<void> {
  const state = await readState();
  if (state.viewed[reportDate]) return;
  state.viewed[reportDate] = at;
  await writeJsonAtomic(statePath(), state);
}

export async function listUnviewed(): Promise<string[]> {
  const { viewed } = await readState();
  return (await listReportDates()).filter((d) => !viewed[d]);
}

export async function listUnsurfacedFailures(): Promise<RunLog[]> {
  return (await listRunLogs()).filter((r) => r.status === 'failed' && !r.surfacedAt);
}

export async function markSurfaced(runId: string, at: string): Promise<void> {
  const log = await readRunLog(runId);
  if (log) await writeRunLog({ ...log, surfacedAt: at });
}

/** FR-020: a failed (scheduled) generation is recorded so the next session can surface it. */
export async function recordFailure(runId: string, error: string, at: string): Promise<RunLog> {
  const existing = await readRunLog(runId);
  const log: RunLog = existing
    ? { ...existing, status: 'failed', error, finishedAt: at }
    : { runId, trigger: 'scheduled', startedAt: at, finishedAt: at, status: 'failed', error };
  await writeRunLog(log);
  return log;
}
