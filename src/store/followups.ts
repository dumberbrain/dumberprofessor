import { FollowUp, FollowUpsFile } from '../schemas/state.js';
import { dataPath, readJsonOr, writeJsonAtomic } from './fs.js';

const path = () => dataPath('followups.json');

async function readAll(): Promise<FollowUp[]> {
  return (await readJsonOr(path(), FollowUpsFile, { followUps: [] })).followUps;
}

async function writeAll(followUps: FollowUp[]): Promise<void> {
  await writeJsonAtomic(path(), { followUps: followUps.map((f) => FollowUp.parse(f)) });
}

export async function listFollowUps(status?: FollowUp['status']): Promise<FollowUp[]> {
  const all = await readAll();
  return status ? all.filter((f) => f.status === status) : all;
}

export async function createFollowUp(originItemId: string, reasonAz: string, at: string): Promise<FollowUp> {
  const all = await readAll();
  const n = all.reduce((max, f) => Math.max(max, Number(/^fu-(\d+)$/.exec(f.followUpId)?.[1] ?? 0)), 0) + 1;
  const followUp: FollowUp = { followUpId: `fu-${n}`, originItemId, reasonAz, status: 'open', updatedAt: at };
  await writeAll([...all, followUp]);
  return followUp;
}

/** Only open follow-ups can change state; resolved and dismissed are terminal. */
async function transition(id: string, patch: Partial<FollowUp>): Promise<FollowUp> {
  const all = await readAll();
  const current = all.find((f) => f.followUpId === id);
  if (!current) throw new Error(`follow-up "${id}" not found`);
  if (current.status !== 'open') throw new Error(`follow-up "${id}" is not open (${current.status})`);
  const next = FollowUp.parse({ ...current, ...patch });
  await writeAll(all.map((f) => (f.followUpId === id ? next : f)));
  return next;
}

export function resolveFollowUp(id: string, resolvedBy: string, at: string): Promise<FollowUp> {
  return transition(id, { status: 'resolved', resolvedBy, updatedAt: at });
}

export function dismissFollowUp(id: string, at: string): Promise<FollowUp> {
  return transition(id, { status: 'dismissed', updatedAt: at });
}
