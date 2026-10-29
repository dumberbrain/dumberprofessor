import { z } from 'zod';

const isoDateTime = z.iso.datetime({ offset: true });
const isoDate = z.iso.date();

export const FollowUp = z
  .object({
    followUpId: z.string(),
    originItemId: z.string(),
    reasonAz: z.string().min(1),
    status: z.enum(['open', 'resolved', 'dismissed']),
    resolvedBy: z.string().optional(),
    updatedAt: isoDateTime,
  })
  .superRefine((f, ctx) => {
    if (f.status === 'resolved' && !f.resolvedBy) {
      ctx.addIssue({ code: 'custom', path: ['resolvedBy'], message: 'resolved follow-up requires resolvedBy' });
    }
  });
export type FollowUp = z.infer<typeof FollowUp>;

export const FollowUpsFile = z.object({ followUps: z.array(FollowUp) });

export const Feedback = z.object({
  reportDate: isoDate,
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
  ratedAt: isoDateTime,
});
export type Feedback = z.infer<typeof Feedback>;

export const FeedbackFile = z.object({ feedback: z.array(Feedback) });

export const RunLog = z.object({
  runId: z.string(),
  trigger: z.enum(['on-demand', 'scheduled']),
  startedAt: isoDateTime,
  finishedAt: isoDateTime.optional(),
  status: z.enum(['running', 'succeeded', 'failed']),
  error: z.string().optional(),
  reportDate: isoDate.optional(),
  surfacedAt: isoDateTime.optional(),
});
export type RunLog = z.infer<typeof RunLog>;

export const State = z.object({
  viewed: z.record(z.string(), isoDateTime).default({}),
});
export type State = z.infer<typeof State>;
