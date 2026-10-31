import { readdir } from 'node:fs/promises';
import type { RunEnvelope } from '../schemas/candidate.js';
import {
  Addendum,
  DailyReport,
  IndexedItem,
  type NewsItem,
  type QualitySignals,
  type ReportDraft,
} from '../schemas/report.js';
import type { FollowUp } from '../schemas/state.js';
import { renderReport } from '../report/render-md.js';
import { appendJsonl, dataPath, exists, readJson, readJsonl, writeOnce } from './fs.js';
import { updateRunLog } from './runs.js';

const reportsDir = () => dataPath('reports');
export const reportJsonPath = (date: string) => dataPath('reports', `${date}.json`);
export const reportMdPath = (date: string) => dataPath('reports', `${date}.md`);
const addendumPath = (date: string, n: number) => dataPath('reports', `${date}.addendum-${n}.json`);
export const indexPath = () => dataPath('index', 'items.jsonl');

const REPORT_FILE = /^(\d{4}-\d{2}-\d{2})\.json$/;
const ADDENDUM_FILE = /^(\d{4}-\d{2}-\d{2})\.addendum-(\d+)\.json$/;

async function reportFiles(): Promise<string[]> {
  return (await exists(reportsDir())) ? (await readdir(reportsDir())).sort() : [];
}

export async function listReportDates(): Promise<string[]> {
  return (await reportFiles()).flatMap((f) => REPORT_FILE.exec(f)?.[1] ?? []);
}

async function listAddenda(date: string): Promise<Addendum[]> {
  const files = (await reportFiles())
    .map((f) => ADDENDUM_FILE.exec(f))
    .filter((m): m is RegExpExecArray => m !== null && m[1] === date)
    .sort((a, b) => Number(a[2]) - Number(b[2]));
  return Promise.all(files.map((m) => readJson(dataPath('reports', m[0]), Addendum)));
}

export async function getReport(date: string): Promise<{ report: DailyReport; addenda: Addendum[] } | null> {
  if (!(await exists(reportJsonPath(date)))) return null;
  return { report: await readJson(reportJsonPath(date), DailyReport), addenda: await listAddenda(date) };
}

/** Start of the next reporting window: latest report or addendum generation time. */
export async function lastGeneratedAt(): Promise<string | null> {
  const dates = await listReportDates();
  const latest = dates.at(-1);
  if (!latest) return null;
  const found = await getReport(latest);
  if (!found) return null;
  const times = [found.report.generatedAt, ...found.addenda.map((a) => a.addedAt)];
  return times.sort((a, b) => Date.parse(a) - Date.parse(b)).at(-1)!;
}

export function readIndex(): Promise<IndexedItem[]> {
  return readJsonl(indexPath(), IndexedItem);
}

function toNewsItems(draft: ReportDraft, idPrefix: string): NewsItem[] {
  return draft.items.map((item, i) => ({ itemId: `${idPrefix}-${i + 1}`, rank: i + 1, ...item }));
}

export function qualitySignals(items: NewsItem[], run: RunEnvelope): QualitySignals {
  const eligible = items.filter((i) => i.category !== 'community-opinion');
  const fullyVerified = eligible.filter((i) => i.claims.every((c) => c.status === 'verified'));
  return {
    itemCount: items.length,
    verifiedShare: eligible.length ? fullyVerified.length / eligible.length : 1,
    duplicatesRemoved: run.droppedAsDuplicate,
    droppedAsOld: run.droppedAsOld,
    unavailableSourceCount: run.sources.filter((s) => s.status === 'unavailable').length,
    vendorReportedCount: items.flatMap((i) => i.claims).filter((c) => c.status === 'vendor-reported').length,
    notAnalyzedVideos: items.filter((i) => i.video?.notAnalyzed).length,
  };
}

async function indexItems(items: NewsItem[], reportDate: string, run: RunEnvelope): Promise<void> {
  const byId = new Map(run.candidates.map((c) => [c.candidateId, c]));
  await appendJsonl(
    indexPath(),
    items.map((item) => IndexedItem.parse({ ...item, reportDate, canonicalUrl: byId.get(item.candidateId)!.canonicalUrl })),
  );
}

export interface SaveOptions {
  generatedAt: string;
  /** Open follow-ups to embed in the report (US4). */
  followUps?: FollowUp[];
}

export type SaveResult =
  | { kind: 'report'; path: string; report: DailyReport }
  | { kind: 'addendum'; path: string; addendum: Addendum };

/** Stores a validated draft as an immutable report (FR-021) and indexes its items. */
export async function saveReport(draft: ReportDraft, run: RunEnvelope, opts: SaveOptions): Promise<SaveResult> {
  const date = draft.reportDate;
  const items = toNewsItems(draft, date);
  const related = items.find((i) => i.candidateId === draft.knowledgeCheck.relatedCandidateId)!;
  const report = DailyReport.parse({
    reportDate: date,
    generatedAt: opts.generatedAt,
    runId: run.runId,
    trigger: draft.trigger,
    coveredPeriod: { start: run.window.start, end: run.window.end },
    catchUp: run.window.catchUp,
    focus: draft.focus,
    depthByDomain: run.depthByDomain,
    executiveSummaryAz: draft.executiveSummaryAz,
    fewItemsNote: draft.fewItemsNote,
    items,
    recommendationsAz: draft.recommendationsAz,
    followUps: (opts.followUps ?? []).map(({ followUpId, originItemId, reasonAz }) => ({ followUpId, originItemId, reasonAz })),
    knowledgeCheck: { questionAz: draft.knowledgeCheck.questionAz, relatedItemId: related.itemId },
    unavailableSources: run.sources.filter((s) => s.status === 'unavailable').map((s) => s.id),
    quality: qualitySignals(items, run),
  });
  await writeOnce(reportJsonPath(date), `${JSON.stringify(report, null, 2)}\n`);
  await writeOnce(reportMdPath(date), renderReport(report));
  await indexItems(items, date, run);
  await updateRunLog(run.runId, { status: 'succeeded', finishedAt: opts.generatedAt, reportDate: date });
  return { kind: 'report', path: reportMdPath(date), report };
}

/** Same-day late additions; the base report is never modified. */
export async function saveAddendum(draft: ReportDraft, run: RunEnvelope, opts: SaveOptions): Promise<SaveResult> {
  const date = draft.reportDate;
  if (!(await exists(reportJsonPath(date)))) throw new Error(`no report for ${date} to append to`);
  const n = (await listAddenda(date)).length + 1;
  const addendum = Addendum.parse({ addedAt: opts.generatedAt, runId: run.runId, items: toNewsItems(draft, `${date}-a${n}`) });
  const path = addendumPath(date, n);
  await writeOnce(path, `${JSON.stringify(addendum, null, 2)}\n`);
  await indexItems(addendum.items, date, run);
  await updateRunLog(run.runId, { status: 'succeeded', finishedAt: opts.generatedAt, reportDate: date });
  return { kind: 'addendum', path, addendum };
}
