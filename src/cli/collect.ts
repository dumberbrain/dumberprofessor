import { collect } from '../collect/collect.js';
import { matchHistoryStage } from '../pipeline/history-match.js';
import { CliError, flag, type Command } from './args.js';

const run: Command = async (args) => {
  const nowFlag = flag(args, 'now');
  const now = nowFlag ? new Date(nowFlag) : undefined;
  if (now && Number.isNaN(now.getTime())) throw new CliError(`--now: invalid date "${nowFlag}"`);
  const trigger = flag(args, 'trigger') ?? 'on-demand';
  if (trigger !== 'on-demand' && trigger !== 'scheduled') throw new CliError('--trigger: on-demand | scheduled');

  const result = await collect({ now, trigger, historyStage: matchHistoryStage });
  const unavailable = result.sources.filter((s) => s.status === 'unavailable');
  const text = [
    `run ${result.runId}`,
    `window ${result.window.start} → ${result.window.end}${result.window.catchUp ? ' (catch-up)' : ''}`,
    `${result.candidates.length} candidates · ${result.droppedAsDuplicate} duplicates · ${result.droppedAsOld} old · ${result.droppedAsIgnored} ignored`,
    `${result.toVisit.length} web sources to visit: ${result.toVisit.map((s) => s.id).join(', ') || '-'}`,
    `${unavailable.length} unavailable: ${unavailable.map((s) => `${s.id} (${s.error})`).join(', ') || '-'}`,
    `candidates: data/runs/${result.runId}/candidates.json`,
  ].join('\n');
  return { data: result, text };
};

export default { '': run } satisfies Record<string, Command>;
