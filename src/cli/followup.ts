import { loadSettings } from '../config/load.js';
import { toIsoInZone } from '../lib/time.js';
import { dismissFollowUp, listFollowUps } from '../store/followups.js';
import { CliError, flag, type Command } from './args.js';

const STATUSES = ['open', 'resolved', 'dismissed'] as const;

/** fp followup list [--status open|resolved|dismissed] */
const list: Command = async (args) => {
  const status = flag(args, 'status');
  if (status && !STATUSES.includes(status as (typeof STATUSES)[number])) {
    throw new CliError(`--status: one of ${STATUSES.join(', ')}`);
  }
  const items = await listFollowUps(status as (typeof STATUSES)[number] | undefined);
  const text = items.length
    ? items
        .map((f) => `${f.followUpId}  [${f.status}]  ${f.originItemId}: ${f.reasonAz}${f.resolvedBy ? ` → ${f.resolvedBy}` : ''}`)
        .join('\n')
    : 'no follow-ups';
  return { data: items, text };
};

/** fp followup dismiss <followUpId> */
const dismiss: Command = async (args) => {
  const id = args.positional[0];
  if (!id) throw new CliError('usage: fp followup dismiss <followUpId>');
  const { timeZone } = await loadSettings();
  try {
    const f = await dismissFollowUp(id, toIsoInZone(new Date(), timeZone));
    return { data: f, text: `dismissed ${id}` };
  } catch (err) {
    throw new CliError(err instanceof Error ? err.message : String(err));
  }
};

export default { list, dismiss } satisfies Record<string, Command>;
