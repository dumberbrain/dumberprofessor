import { z } from 'zod';

const isoDate = z.iso.date();

export const Attempt = z.object({
  at: isoDate,
  kind: z.enum(['lesson', 'review']),
  score: z.number().int().min(0),
  total: z.number().int().min(0),
});
export type Attempt = z.infer<typeof Attempt>;

/** One topic of the learning record (constitution: Learning Verification). */
export const LearningEntry = z.object({
  domain: z.string(),
  topic: z.string(),
  status: z.enum(['in-progress', 'learning', 'mastered']),
  startedAt: isoDate,
  /** successful assessments in a row */
  streak: z.number().int().min(0).default(0),
  intervalDays: z.number().int().min(0).default(0),
  lastReview: isoDate.optional(),
  nextReview: isoDate.optional(),
  confidence: z.enum(['low', 'medium', 'high']).default('low'),
  prerequisites: z.array(z.string()).default([]),
  objectives: z.array(z.string()).default([]),
  strengths: z.array(z.string()).default([]),
  misconceptions: z.array(z.string()).default([]),
  attempts: z.array(Attempt).default([]),
});
export type LearningEntry = z.infer<typeof LearningEntry>;

export const LearningRecord = z.object({ entries: z.array(LearningEntry) });
export type LearningRecord = z.infer<typeof LearningRecord>;
