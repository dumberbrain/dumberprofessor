import { describe, expect, it } from 'vitest';
import { computeWindow } from '../../src/pipeline/window.js';

const tz = 'Asia/Baku'; // UTC+4, no DST
const now = new Date('2026-10-29T04:00:00Z'); // 08:00 Baku

describe('computeWindow', () => {
  it('uses the last 24 hours on the first run', () => {
    const w = computeWindow(null, now, tz);
    expect(w).toEqual({ start: '2026-10-28T08:00:00+04:00', end: '2026-10-29T08:00:00+04:00', catchUp: false });
  });

  it('starts at the previous report when it is within 24 hours', () => {
    const w = computeWindow('2026-10-28T09:30:00+04:00', now, tz);
    expect(w.start).toBe('2026-10-28T09:30:00+04:00');
    expect(w.catchUp).toBe(false);
  });

  it('flags a catch-up when the previous report is older than 24 hours', () => {
    const w = computeWindow('2026-10-26T08:00:00+04:00', now, tz);
    expect(w.start).toBe('2026-10-26T08:00:00+04:00');
    expect(w.catchUp).toBe(true);
  });

  it('caps the window at 7 days', () => {
    const w = computeWindow('2026-10-10T08:00:00+04:00', now, tz);
    expect(w.start).toBe('2026-10-22T08:00:00+04:00');
    expect(w.catchUp).toBe(true);
  });

  it('expresses boundaries in the configured time zone', () => {
    const w = computeWindow(null, now, 'UTC');
    expect(w.end).toBe('2026-10-29T04:00:00+00:00');
  });

  it('treats exactly 24 hours as not a catch-up', () => {
    expect(computeWindow('2026-10-28T08:00:00+04:00', now, tz).catchUp).toBe(false);
  });
});
