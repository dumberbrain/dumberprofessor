import { describe, expect, it } from 'vitest';
import { LearningEntry } from '../../src/schemas/learning.js';
import { applyAssessment } from '../../src/store/learning.js';

const fresh = () => LearningEntry.parse({ domain: 'backend', topic: 'Indexes', status: 'in-progress', startedAt: '2026-10-01' });

describe('applyAssessment', () => {
  it('schedules a growing interval after passes', () => {
    const a = applyAssessment(fresh(), { kind: 'lesson', score: 3, total: 3 }, '2026-10-01');
    expect(a).toMatchObject({ streak: 1, intervalDays: 3, nextReview: '2026-10-04', status: 'learning', confidence: 'medium' });
    const b = applyAssessment(a, { kind: 'review', score: 3, total: 3 }, '2026-10-04');
    expect(b).toMatchObject({ streak: 2, intervalDays: 7, nextReview: '2026-10-11' });
  });

  it('resets after a failed assessment', () => {
    const passed = applyAssessment(fresh(), { kind: 'lesson', score: 3, total: 3 }, '2026-10-01');
    const failed = applyAssessment(passed, { kind: 'review', score: 1, total: 3 }, '2026-10-04');
    expect(failed).toMatchObject({ streak: 0, intervalDays: 1, nextReview: '2026-10-05', confidence: 'low' });
  });

  it('never marks mastery from a single day of quizzes', () => {
    let e = fresh();
    for (let i = 0; i < 4; i++) e = applyAssessment(e, { kind: 'review', score: 3, total: 3 }, '2026-10-01');
    expect(e.status).toBe('learning');
    e = applyAssessment(e, { kind: 'review', score: 3, total: 3 }, '2026-10-08');
    expect(e.status).toBe('mastered');
  });

  it('records an unassessed lesson without counting it as a pass', () => {
    const e = applyAssessment(fresh(), { kind: 'lesson', score: 0, total: 0 }, '2026-10-01');
    expect(e).toMatchObject({ streak: 0, status: 'learning', nextReview: '2026-10-02' });
  });

  it('replaces misconceptions only when given', () => {
    const a = applyAssessment(fresh(), { kind: 'lesson', score: 1, total: 3, misconceptions: ['index on every column'] }, '2026-10-01');
    const b = applyAssessment(a, { kind: 'review', score: 2, total: 3 }, '2026-10-02');
    expect(b.misconceptions).toEqual(['index on every column']);
    const c = applyAssessment(b, { kind: 'review', score: 3, total: 3, misconceptions: [] }, '2026-10-03');
    expect(c.misconceptions).toEqual([]);
  });
});
