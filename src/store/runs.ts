import { readdir } from 'node:fs/promises';
import { RunEnvelope } from '../schemas/candidate.js';
import { RunLog } from '../schemas/state.js';
import { dataPath, exists, readJson, readJsonOr, writeJsonAtomic } from './fs.js';

export const runDir = (runId: string) => dataPath('runs', runId);
const candidatesPath = (runId: string) => dataPath('runs', runId, 'candidates.json');
const logPath = (runId: string) => dataPath('runs', runId, 'run.json');

export async function writeRun(run: RunEnvelope): Promise<string> {
  const path = candidatesPath(run.runId);
  await writeJsonAtomic(path, run);
  return path;
}

export async function readRun(runId: string): Promise<RunEnvelope> {
  const path = candidatesPath(runId);
  if (!(await exists(path))) throw new Error(`run "${runId}" not found at ${path}`);
  return readJson(path, RunEnvelope);
}

export async function writeRunLog(log: RunLog): Promise<void> {
  await writeJsonAtomic(logPath(log.runId), RunLog.parse(log));
}

export async function readRunLog(runId: string): Promise<RunLog | null> {
  return readJsonOr(logPath(runId), RunLog.nullable(), null);
}

export async function updateRunLog(runId: string, patch: Partial<RunLog>): Promise<RunLog> {
  const current = await readRunLog(runId);
  if (!current) throw new Error(`run log "${runId}" not found`);
  const next = RunLog.parse({ ...current, ...patch });
  await writeRunLog(next);
  return next;
}

export async function listRunLogs(): Promise<RunLog[]> {
  const root = dataPath('runs');
  if (!(await exists(root))) return [];
  const entries = await readdir(root, { withFileTypes: true });
  const logs: RunLog[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const log = await readRunLog(e.name);
    if (log) logs.push(log);
  }
  return logs.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}
