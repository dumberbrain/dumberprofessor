import { z } from 'zod';
import { Domain, Tier } from './enums.js';
import { Source } from './config.js';

export const EXCERPT_MAX = 2_000;
export const TRANSCRIPT_MAX = 20_000;

const isoDateTime = z.iso.datetime({ offset: true });

export const TranscriptSegment = z.object({ t: z.number().int().min(0), text: z.string() });

export const Transcript = z.object({
  status: z.enum(['ok', 'unavailable']),
  language: z.string().optional(),
  segments: z.array(TranscriptSegment).optional(),
  reason: z.string().optional(),
});
export type Transcript = z.infer<typeof Transcript>;

export const SupportingRef = z.object({ sourceId: z.string(), url: z.url(), tier: Tier });

/** Normalized item produced by `fp collect`. All text fields are untrusted data (FR-006). */
export const Candidate = z.object({
  candidateId: z.string().length(12),
  title: z.string(),
  url: z.url(),
  canonicalUrl: z.url(),
  sourceId: z.string(),
  tier: Tier,
  domains: z.array(Domain).min(1),
  publishedAt: isoDateTime.nullable(),
  discoveredAt: isoDateTime,
  excerpt: z.string().max(EXCERPT_MAX),
  supporting: z.array(SupportingRef).default([]),
  possibleUpdateOf: z.string().optional(),
  score: z.number().default(0),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  video: z
    .object({
      channel: z.string(),
      transcript: Transcript,
    })
    .optional(),
});
export type Candidate = z.infer<typeof Candidate>;

export const ReportingWindow = z.object({
  start: isoDateTime,
  end: isoDateTime,
  catchUp: z.boolean(),
});
export type ReportingWindow = z.infer<typeof ReportingWindow>;

export const SourceStatus = z.object({
  id: z.string(),
  status: z.enum(['ok', 'unavailable']),
  error: z.string().optional(),
  count: z.number().int().min(0).default(0),
});
export type SourceStatus = z.infer<typeof SourceStatus>;

export const RunEnvelope = z.object({
  runId: z.string(),
  trigger: z.enum(['on-demand', 'scheduled']),
  window: ReportingWindow,
  sources: z.array(SourceStatus),
  toVisit: z.array(Source),
  candidates: z.array(Candidate),
  droppedAsDuplicate: z.number().int().min(0),
  droppedAsOld: z.number().int().min(0),
  droppedAsIgnored: z.number().int().min(0).default(0),
});
export type RunEnvelope = z.infer<typeof RunEnvelope>;
