import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseDocument } from 'yaml';
import { loadSettings, settingsPath } from '../config/load.js';
import { createScheduler, TASK_NAME } from '../schedule/schtasks.js';
import { writeAtomic } from '../store/fs.js';
import { CliError, EXIT, flag, type Command } from './args.js';

function scheduler() {
  const workingDir = process.cwd();
  return createScheduler({ workingDir, scriptPath: resolve(workingDir, 'scripts', 'schedule', 'run-scheduled.ps1') });
}

async function writeSchedule(patch: { enabled: boolean; generationTime?: string }): Promise<void> {
  const path = settingsPath();
  const doc = parseDocument(await readFile(path, 'utf8'));
  doc.setIn(['schedule', 'enabled'], patch.enabled);
  if (patch.generationTime) doc.setIn(['schedule', 'generationTime'], patch.generationTime);
  await writeAtomic(path, doc.toString());
}

/** fp schedule enable [--time HH:mm] — enabled only after the task is observed (FR-019). */
const enable: Command = async (args) => {
  if (process.platform !== 'win32') throw new CliError('scheduling uses Windows Task Scheduler; not available on this platform');
  const settings = await loadSettings();
  const time = flag(args, 'time') ?? settings.generationTime;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new CliError(`--time: expected HH:mm, got "${time}"`);
  try {
    const status = await scheduler().enable(time);
    await writeSchedule({ enabled: true, generationTime: time });
    return { data: { enabled: true, time, ...status }, text: `scheduled daily at ${time} (${TASK_NAME}); next run: ${status.nextRun ?? 'unknown'}` };
  } catch (err) {
    await writeSchedule({ enabled: false });
    throw new CliError(`scheduling refused: ${err instanceof Error ? err.message : String(err)}`, EXIT.invalid);
  }
};

const disable: Command = async () => {
  await scheduler().disable();
  await writeSchedule({ enabled: false });
  return { data: { enabled: false }, text: 'schedule disabled' };
};

/** Reports the task as observed in Task Scheduler, alongside the configured value. */
const status: Command = async () => {
  const settings = await loadSettings();
  const observed = process.platform === 'win32' ? await scheduler().status() : { registered: false };
  const mismatch = settings.enabled !== observed.registered;
  const text = [
    `configured: ${settings.enabled ? `enabled at ${settings.generationTime} (${settings.timeZone})` : 'disabled'}`,
    `observed:   ${observed.registered ? `registered, next run ${observed.nextRun ?? 'unknown'}, ${observed.state ?? ''}` : 'not registered'}`,
    ...(mismatch ? ['⚠️ configuration and Task Scheduler disagree; run "fp schedule enable" or "fp schedule disable"'] : []),
  ].join('\n');
  return { data: { configured: settings, observed, mismatch }, text };
};

export default { enable, disable, status } satisfies Record<string, Command>;
