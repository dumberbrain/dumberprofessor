import { readFile } from 'node:fs/promises';
import { loadSettings, loadSources } from '../config/load.js';
import { loadProfessor } from '../config/professor.js';
import { addDays, localDate, toIsoInZone } from '../lib/time.js';
import { renderReport } from '../report/render-md.js';
import { validateDraft } from '../report/validate.js';
import { createFollowUp, listFollowUps, resolveFollowUp } from '../store/followups.js';
import { getReport, listReportDates, readIndex, saveAddendum, saveReport } from '../store/reports.js';
import { readRun } from '../store/runs.js';
import { markViewed } from '../store/state.js';
import { CliError, EXIT, flag, type Command } from './args.js';

/** fp save-report <draft.json> [--append] */
const saveReportCmd: Command = async (args) => {
  const draftPath = args.positional[0];
  if (!draftPath) throw new CliError('usage: fp save-report <draft.json> [--append]');
  let input: unknown;
  try {
    input = JSON.parse(await readFile(draftPath, 'utf8'));
  } catch (err) {
    throw new CliError(`cannot read draft ${draftPath}: ${err instanceof Error ? err.message : String(err)}`);
  }
  const runId = (input as { runId?: unknown })?.runId;
  if (typeof runId !== 'string') throw new CliError('draft: runId is required');
  const run = await readRun(runId);

  const openFollowUps = await listFollowUps('open');
  const result = validateDraft(input, run, {
    sources: await loadSources(),
    indexItemIds: new Set((await readIndex()).map((i) => i.itemId)),
    openFollowUpIds: new Set(openFollowUps.map((f) => f.followUpId)),
    domains: (await loadProfessor()).domains.map((d) => d.id),
  });
  if (!result.ok) throw new CliError(`draft rejected (${result.errors.length} errors)`, EXIT.invalid, result.errors);
  const draft = result.draft;

  const { timeZone } = await loadSettings();
  const generatedAt = toIsoInZone(new Date(), timeZone);
  const resolving = new Set(draft.items.map((i) => i.resolvesFollowUp).filter(Boolean));
  const saveOpts = { generatedAt, followUps: openFollowUps.filter((f) => !resolving.has(f.followUpId)) };
  const saved = args.flags.append === true
    ? await saveAddendum(draft, run, saveOpts)
    : await saveReport(draft, run, saveOpts);

  // FR-022: resolve follow-ups answered by this report and open new ones.
  const items = saved.kind === 'report' ? saved.report.items : saved.addendum.items;
  const itemIdOf = new Map(items.map((i) => [i.candidateId, i.itemId]));
  for (const item of items) {
    if (item.resolvesFollowUp) await resolveFollowUp(item.resolvesFollowUp, item.itemId, generatedAt);
  }
  for (const f of draft.newFollowUps ?? []) await createFollowUp(itemIdOf.get(f.candidateId)!, f.reasonAz, generatedAt);
  const count = saved.kind === 'report' ? saved.report.items.length : saved.addendum.items.length;
  // The report itself is stored; a failing library copy must not fail the save.
  const document = await import('./documents.js')
    .then((m) => m.exportNews(draft.reportDate))
    .catch(() => null);
  return {
    data: { kind: saved.kind, path: saved.path, items: count, document },
    text: `saved ${saved.kind} (${count} items): ${saved.path}${document ? `\ncopied to ${document}` : ''}`,
  };
};

export async function resolveReportDate(spec: string | undefined, timeZone: string): Promise<string> {
  const today = localDate(new Date(), timeZone);
  if (!spec || spec === 'today') return today;
  if (spec === 'yesterday') return addDays(today, -1);
  if (spec === 'latest') {
    const latest = (await listReportDates()).at(-1);
    if (!latest) throw new CliError('no reports yet', EXIT.nothing);
    return latest;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(spec)) return spec;
  throw new CliError(`unknown date "${spec}" (today | yesterday | latest | YYYY-MM-DD)`);
}

/** fp show [today|yesterday|latest|YYYY-MM-DD] [--format md|json] — returns stored content unchanged. */
const show: Command = async (args) => {
  const { timeZone } = await loadSettings();
  const date = await resolveReportDate(args.positional[0], timeZone);
  const found = await getReport(date);
  if (!found) throw new CliError(`no report for ${date}`, EXIT.nothing);
  await markViewed(date, toIsoInZone(new Date(), timeZone));
  const format = flag(args, 'format') ?? 'md';
  if (format === 'json') return { data: found, raw: JSON.stringify(found, null, 2) };
  return { data: found, text: renderReport(found.report, found.addenda) };
};

export const saveReportCommands = { '': saveReportCmd } satisfies Record<string, Command>;
export const showCommands = { '': show } satisfies Record<string, Command>;
