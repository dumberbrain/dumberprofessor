import { addDays } from '../lib/time.js';
import { LearningRecord, type LearningEntry } from '../schemas/learning.js';
import { dataPath, readJsonOr, writeJsonAtomic } from './fs.js';

const recordPath = () => dataPath('learning', 'record.json');

/** Days until the next review after the n-th successful assessment in a row. */
export const INTERVALS = [1, 3, 7, 14, 30, 60] as const;
const PASS = 0.8;
const FAIL = 0.6;

export async function readRecord(): Promise<LearningRecord> {
  return readJsonOr(recordPath(), LearningRecord, { entries: [] });
}

async function writeRecord(record: LearningRecord): Promise<void> {
  await writeJsonAtomic(recordPath(), record);
}

const same = (e: LearningEntry, domain: string, topic: string) =>
  e.domain === domain && e.topic.toLowerCase() === topic.toLowerCase();

export function findEntry(record: LearningRecord, domain: string, topic: string): LearningEntry | undefined {
  return record.entries.find((e) => same(e, domain, topic));
}

export interface TopicPlan {
  prerequisites?: string[];
  objectives?: string[];
}

/** Marks a topic as being taught; an existing entry keeps its history. Given plan fields replace stored ones. */
export async function startTopic(
  domain: string,
  topic: string,
  today: string,
  plan: TopicPlan = {},
): Promise<LearningEntry> {
  const record = await readRecord();
  let entry = findEntry(record, domain, topic);
  if (!entry) {
    entry = LearningRecord.shape.entries.element.parse({ domain, topic, status: 'in-progress', startedAt: today });
    record.entries.push(entry);
  } else if (entry.status !== 'mastered') {
    entry.status = 'in-progress';
  }
  if (plan.prerequisites?.length) entry.prerequisites = plan.prerequisites;
  if (plan.objectives?.length) entry.objectives = plan.objectives;
  await writeRecord(record);
  return entry;
}

export interface Assessment {
  kind: 'lesson' | 'review';
  score: number;
  total: number;
  strengths?: string[];
  misconceptions?: string[];
}

/**
 * Applies one assessment and schedules the next review. A topic is mastered only after three
 * passes in a row spread over at least two different days — never from a single quiz.
 */
export function applyAssessment(entry: LearningEntry, a: Assessment, today: string): LearningEntry {
  const next: LearningEntry = {
    ...entry,
    attempts: [...entry.attempts, { at: today, kind: a.kind, score: a.score, total: a.total }],
  };
  if (a.strengths?.length) next.strengths = unique([...entry.strengths, ...a.strengths]);
  if (a.misconceptions) next.misconceptions = unique(a.misconceptions);

  const ratio = a.total === 0 ? null : a.score / a.total;
  if (ratio === null) {
    next.intervalDays = 1;
  } else if (ratio >= PASS) {
    next.streak = entry.streak + 1;
    next.intervalDays = INTERVALS[Math.min(next.streak, INTERVALS.length - 1)]!;
  } else if (ratio < FAIL) {
    next.streak = 0;
    next.intervalDays = 1;
  } else {
    next.intervalDays = Math.max(1, entry.intervalDays);
  }

  const passDays = new Set(next.attempts.filter((t) => t.total > 0 && t.score / t.total >= PASS).map((t) => t.at));
  next.status = next.streak >= 3 && passDays.size >= 2 ? 'mastered' : 'learning';
  next.confidence = next.streak >= 3 ? 'high' : next.streak >= 1 ? 'medium' : 'low';
  next.lastReview = today;
  next.nextReview = addDays(today, next.intervalDays);
  return next;
}

export async function recordAssessment(
  domain: string,
  topic: string,
  a: Assessment,
  today: string,
): Promise<LearningEntry> {
  const record = await readRecord();
  const index = record.entries.findIndex((e) => same(e, domain, topic));
  const base =
    index >= 0
      ? record.entries[index]!
      : LearningRecord.shape.entries.element.parse({ domain, topic, status: 'in-progress', startedAt: today });
  const updated = applyAssessment(base, a, today);
  if (index >= 0) record.entries[index] = updated;
  else record.entries.push(updated);
  await writeRecord(record);
  return updated;
}

export function dueEntries(record: LearningRecord, today: string, domain?: string): LearningEntry[] {
  return record.entries
    .filter((e) => e.nextReview && e.nextReview <= today && (!domain || e.domain === domain))
    .sort((a, b) => a.nextReview!.localeCompare(b.nextReview!));
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}
