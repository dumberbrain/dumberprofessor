import { randomBytes } from 'node:crypto';
import { CliError, EXIT } from '../cli/args.js';
import { loadInterests, loadSettings, loadSources } from '../config/load.js';
import { loadProfessor } from '../config/professor.js';
import { redact, type FetchLike } from '../lib/http.js';
import { localDate, toIsoInZone } from '../lib/time.js';
import { dedupe } from '../pipeline/dedupe.js';
import { rank } from '../pipeline/rank.js';
import { computeWindow } from '../pipeline/window.js';
import type { Candidate, RunEnvelope, SourceStatus } from '../schemas/candidate.js';
import type { InterestProfile, Source } from '../schemas/config.js';
import type { Depth } from '../schemas/professor.js';
import { lastGeneratedAt as storedLastGeneratedAt } from '../store/reports.js';
import { writeRun, writeRunLog } from '../store/runs.js';
import { githubAdvisoriesAdapter } from './adapters/github-advisories.js';
import { hnAdapter } from './adapters/hn.js';
import { rssAdapter } from './adapters/rss.js';
import type { Adapter, TranscriptFetcher } from './adapters/types.js';
import { toVisit } from './adapters/web.js';
import { youtubeAdapter } from './adapters/youtube.js';
import { createTranscriptFetcher } from './transcript.js';

const ADAPTERS: Partial<Record<Source['type'], Adapter>> = {
  rss: rssAdapter,
  youtube: youtubeAdapter,
  hn: hnAdapter,
  'github-advisories': githubAdvisoriesAdapter,
};

/** Hook for history matching (US4); identity by default. */
export type CandidateStage = (candidates: Candidate[], now: Date) => Promise<Candidate[]>;

export interface CollectOptions {
  now?: Date;
  trigger?: 'on-demand' | 'scheduled';
  timeZone?: string;
  sources?: Source[];
  profile?: InterestProfile;
  fetchImpl?: FetchLike;
  transcripts?: TranscriptFetcher;
  /** undefined → read from stored reports; null → first run */
  lastGeneratedAt?: string | null;
  historyStage?: CandidateStage;
  /** undefined → read focus and depths from config/professor.json */
  focus?: string[];
  depthByDomain?: Record<string, Depth>;
}

function newRunId(now: Date, timeZone: string): string {
  const iso = toIsoInZone(now, timeZone);
  return `${localDate(now, timeZone)}-${iso.slice(11, 19).replace(/:/g, '')}-${randomBytes(2).toString('hex')}`;
}

/** One collection run: window → fetch → drop old → dedupe → history → rank → persist. */
export async function collect(opts: CollectOptions = {}): Promise<RunEnvelope> {
  const now = opts.now ?? new Date();
  const trigger = opts.trigger ?? 'on-demand';
  const timeZone = opts.timeZone ?? (await loadSettings()).timeZone;
  const sources = (opts.sources ?? (await loadSources())).filter((s) => s.enabled);
  const profile = opts.profile ?? (await loadInterests());
  const last = opts.lastGeneratedAt === undefined ? await storedLastGeneratedAt() : opts.lastGeneratedAt;
  const transcripts = opts.transcripts ?? createTranscriptFetcher();
  const { focus, depthByDomain } =
    opts.focus !== undefined
      ? { focus: opts.focus, depthByDomain: opts.depthByDomain ?? {} }
      : await loadProfessor().then((cfg) => ({
          focus: cfg.focus,
          depthByDomain: Object.fromEntries(cfg.domains.map((d) => [d.id, d.depth])),
        }));

  const runId = newRunId(now, timeZone);
  const startedAt = toIsoInZone(now, timeZone);
  await writeRunLog({ runId, trigger, startedAt, status: 'running' });

  const window = computeWindow(last, now, timeZone);
  const ctx = { fetchImpl: opts.fetchImpl, window, discoveredAt: window.end, transcripts };

  const fetchable = sources.filter((s) => ADAPTERS[s.type]);
  const results = await Promise.all(
    fetchable.map(async (source): Promise<[SourceStatus, Candidate[]]> => {
      try {
        const items = await ADAPTERS[source.type]!(source, ctx);
        return [{ id: source.id, status: 'ok', count: items.length }, items];
      } catch (err) {
        const error = redact(err instanceof Error ? err.message : String(err));
        return [{ id: source.id, status: 'unavailable', error, count: 0 }, []];
      }
    }),
  );
  const statuses = results.map(([s]) => s);

  if (fetchable.length > 0 && statuses.every((s) => s.status === 'unavailable')) {
    const error = 'all sources unavailable';
    await writeRunLog({
      runId,
      trigger,
      startedAt,
      status: 'failed',
      error,
      finishedAt: toIsoInZone(new Date(), timeZone),
    });
    throw new CliError(error, EXIT.nothing, statuses);
  }

  // FR-010: items published before the window are dropped even if they are popular now.
  const windowStart = Date.parse(window.start);
  const all = results.flatMap(([, items]) => items);
  const fresh = all.filter((c) => c.publishedAt === null || Date.parse(c.publishedAt) >= windowStart);

  const deduped = dedupe(fresh);
  const matched = opts.historyStage ? await opts.historyStage(deduped.candidates, now) : deduped.candidates;
  const ranked = rank(matched, profile, focus);

  const run: RunEnvelope = {
    runId,
    trigger,
    window,
    sources: statuses,
    toVisit: toVisit(sources),
    candidates: ranked.candidates,
    droppedAsDuplicate: deduped.dropped,
    droppedAsOld: all.length - fresh.length,
    droppedAsIgnored: ranked.dropped,
    focus,
    depthByDomain,
  };
  await writeRun(run);
  return run;
}
