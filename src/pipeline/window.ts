import type { ReportingWindow } from '../schemas/candidate.js';
import { toIsoInZone } from '../lib/time.js';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const MAX_WINDOW = 7 * DAY;

/**
 * FR-010a/b: the window runs from the previous report's generation time to now, capped at 7 days;
 * with no previous report it is the last 24 hours. A window longer than 24 hours is a catch-up.
 */
export function computeWindow(lastGeneratedAt: string | null, now: Date, timeZone: string): ReportingWindow {
  const end = now.getTime();
  let start = lastGeneratedAt ? new Date(lastGeneratedAt).getTime() : end - DAY;
  start = Math.max(start, end - MAX_WINDOW);
  return {
    start: toIsoInZone(new Date(start), timeZone),
    end: toIsoInZone(now, timeZone),
    catchUp: end - start > DAY,
  };
}
