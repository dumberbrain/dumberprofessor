import { z } from 'zod';
import { Category, ClaimType, Domain, Tier, VerificationStatus } from './enums.js';
import { ReportingWindow } from './candidate.js';

const isoDateTime = z.iso.datetime({ offset: true });
const isoDate = z.iso.date();

export const SourceRef = z
  .object({
    url: z.url(),
    name: z.string().min(1),
    tier: Tier,
    role: z.enum(['commentary', 'analysis']).optional(),
  })
  .strict();
export type SourceRef = z.infer<typeof SourceRef>;

export const Claim = z
  .object({
    type: ClaimType,
    text: z.string().min(1),
    status: VerificationStatus,
    evidenceUrl: z.url().optional(),
    reason: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((c, ctx) => {
    if (c.status === 'verified' && !c.evidenceUrl) {
      ctx.addIssue({ code: 'custom', path: ['evidenceUrl'], message: 'verified claim requires evidenceUrl' });
    }
    if (c.status === 'unverified' && !c.reason) {
      ctx.addIssue({ code: 'custom', path: ['reason'], message: 'unverified claim requires reason' });
    }
  });
export type Claim = z.infer<typeof Claim>;

export const VideoSummary = z
  .object({
    notAnalyzed: z.boolean(),
    keyPoints: z.array(z.object({ t: z.number().int().min(0), textAz: z.string() }).strict()),
  })
  .strict();

const draftItemShape = {
  candidateId: z.string(),
  title: z.string().min(1),
  summaryAz: z.string().min(1),
  whyItMattersAz: z.string().min(1),
  implicationsAz: z.string().min(1),
  category: Category,
  domains: z.array(Domain).min(1),
  technologies: z.array(z.string()).min(1),
  primarySource: SourceRef,
  supportingSources: z.array(SourceRef).optional(),
  publishedAt: isoDateTime.nullable(),
  discoveredAt: isoDateTime,
  claims: z.array(Claim),
  facts: z.array(z.string()),
  interpretation: z.array(z.string()),
  predictions: z.array(z.string()),
  updateOf: z.string().optional(),
  resolvesFollowUp: z.string().optional(),
  video: VideoSummary.optional(),
  /** copied from the candidate: the item matches none of the focus domains (Principle IX) */
  outsideFocus: z.boolean().optional(),
};

function requireUpdateOf(item: { category: string; updateOf?: string | undefined }, ctx: z.RefinementCtx) {
  if (item.category === 'update' && !item.updateOf) {
    ctx.addIssue({ code: 'custom', path: ['updateOf'], message: 'update item requires updateOf' });
  }
}

/** A news item as drafted by the skill (contracts/report-draft.schema.json). */
export const DraftItem = z.object(draftItemShape).strict().superRefine(requireUpdateOf);
export type DraftItem = z.infer<typeof DraftItem>;

export const Recommendation = z
  .object({
    title: z.string().min(1),
    url: z.url().optional(),
    kind: z.enum(['reading', 'experiment']),
  })
  .strict();

export const ReportDraft = z
  .object({
    runId: z.string(),
    reportDate: isoDate,
    trigger: z.enum(['on-demand', 'scheduled']),
    /** focus the report was produced for; must equal the run's focus */
    focus: z.array(Domain).default([]),
    executiveSummaryAz: z.string().min(1),
    fewItemsNote: z.string().optional(),
    items: z.array(DraftItem).max(7),
    recommendationsAz: z.array(Recommendation),
    newFollowUps: z.array(z.object({ candidateId: z.string(), reasonAz: z.string().min(1) }).strict()).optional(),
    excludedMatches: z.array(z.object({ candidateId: z.string(), reason: z.string().min(1) }).strict()).optional(),
    knowledgeCheck: z.object({ questionAz: z.string().min(1), relatedCandidateId: z.string() }).strict(),
  })
  .strict();
export type ReportDraft = z.infer<typeof ReportDraft>;

const newsItemShape = {
  itemId: z.string(),
  rank: z.number().int().min(1),
  ...draftItemShape,
};

export const NewsItem = z.object(newsItemShape).superRefine(requireUpdateOf);
export type NewsItem = z.infer<typeof NewsItem>;

export const QualitySignals = z.object({
  itemCount: z.number().int().min(0),
  verifiedShare: z.number().min(0).max(1),
  duplicatesRemoved: z.number().int().min(0),
  droppedAsOld: z.number().int().min(0),
  unavailableSourceCount: z.number().int().min(0),
  vendorReportedCount: z.number().int().min(0),
  notAnalyzedVideos: z.number().int().min(0),
});
export type QualitySignals = z.infer<typeof QualitySignals>;

export const FollowUpRef = z.object({
  followUpId: z.string(),
  originItemId: z.string(),
  reasonAz: z.string(),
});

export const Addendum = z.object({
  addedAt: isoDateTime,
  runId: z.string(),
  items: z.array(NewsItem),
});
export type Addendum = z.infer<typeof Addendum>;

export const DailyReport = z.object({
  reportDate: isoDate,
  generatedAt: isoDateTime,
  runId: z.string(),
  trigger: z.enum(['on-demand', 'scheduled']),
  coveredPeriod: ReportingWindow.pick({ start: true, end: true }),
  catchUp: z.boolean(),
  /** absent in pre-002 reports: no focus */
  focus: z.array(Domain).default([]),
  depthByDomain: z.record(z.string(), z.string()).default({}),
  executiveSummaryAz: z.string(),
  fewItemsNote: z.string().optional(),
  items: z.array(NewsItem).max(7),
  recommendationsAz: z.array(Recommendation),
  followUps: z.array(FollowUpRef),
  knowledgeCheck: z.object({ questionAz: z.string(), relatedItemId: z.string() }),
  unavailableSources: z.array(z.string()),
  quality: QualitySignals,
});
export type DailyReport = z.infer<typeof DailyReport>;

/** One line of data/index/items.jsonl */
export const IndexedItem = z.object({ ...newsItemShape, reportDate: isoDate, canonicalUrl: z.url() });
export type IndexedItem = z.infer<typeof IndexedItem>;
