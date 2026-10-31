import { Feedback, FeedbackFile } from '../schemas/state.js';
import { dataPath, exists, readJsonOr, writeJsonAtomic } from './fs.js';
import { reportJsonPath } from './reports.js';

const feedbackPath = () => dataPath('feedback.json');

async function readAll(): Promise<Feedback[]> {
  return (await readJsonOr(feedbackPath(), FeedbackFile, { feedback: [] })).feedback;
}

/** FR-024: one rating per report; re-rating replaces the previous entry. */
export async function rateReport(
  reportDate: string,
  rating: number,
  comment: string | undefined,
  at: string,
): Promise<Feedback> {
  if (!(await exists(reportJsonPath(reportDate)))) throw new Error(`no report for ${reportDate}`);
  const entry = Feedback.parse({ reportDate, rating, ...(comment ? { comment } : {}), ratedAt: at });
  const all = (await readAll()).filter((f) => f.reportDate !== reportDate);
  all.push(entry);
  all.sort((a, b) => a.reportDate.localeCompare(b.reportDate));
  await writeJsonAtomic(feedbackPath(), { feedback: all });
  return entry;
}

export async function getFeedback(reportDate: string): Promise<Feedback | null> {
  return (await readAll()).find((f) => f.reportDate === reportDate) ?? null;
}

export function listFeedback(): Promise<Feedback[]> {
  return readAll();
}
