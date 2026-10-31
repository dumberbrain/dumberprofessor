import { z } from 'zod';

/** 1 primary · 2 technical analysis · 3 discovery/community · 4 learning resource */
export const Tier = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
export type Tier = z.infer<typeof Tier>;

/**
 * A domain id as configured in config/professor.json. Domains are data, not code (constitution
 * Extensibility): membership is checked where the configuration is known (config load,
 * save-report), never here, so stored items of removed domains stay readable.
 */
export const Domain = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be a kebab-case domain id');
export type Domain = z.infer<typeof Domain>;

export const SourceType = z.enum(['rss', 'youtube', 'hn', 'github-advisories', 'web']);
export type SourceType = z.infer<typeof SourceType>;

/** FR-009 */
export const Category = z.enum([
  'breaking',
  'release',
  'ecosystem-change',
  'security-advisory',
  'research',
  'community-opinion',
  'update',
]);
export type Category = z.infer<typeof Category>;

/** FR-004a */
export const ClaimType = z.enum([
  'version',
  'release-status',
  'date',
  'security',
  'breaking-change',
  'performance',
]);
export type ClaimType = z.infer<typeof ClaimType>;

export const VerificationStatus = z.enum(['verified', 'unverified', 'vendor-reported']);
export type VerificationStatus = z.infer<typeof VerificationStatus>;
