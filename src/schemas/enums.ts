import { z } from 'zod';

/** 1 primary · 2 technical analysis · 3 discovery/community · 4 learning resource */
export const Tier = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
export type Tier = z.infer<typeof Tier>;

export const Domain = z.enum(['frontend', 'system-design', 'security', 'ai-llm']);
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
