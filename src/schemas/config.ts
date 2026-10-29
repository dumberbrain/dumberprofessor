import { z } from 'zod';
import { Domain, SourceType, Tier } from './enums.js';

/** A configured source. Every Extensibility field is required (constitution). */
export const Source = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be kebab-case'),
    name: z.string().min(1),
    type: SourceType,
    url: z.url(),
    channelId: z.string().nullable().optional(),
    tier: Tier,
    domains: z.array(Domain).min(1),
    purpose: z.string().min(1),
    updateFrequency: z.string().min(1),
    reliability: z.string().min(1),
    limitations: z.string().min(1),
    failureBehavior: z.string().min(1),
    enabled: z.boolean().default(true),
    params: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
export type Source = z.infer<typeof Source>;

export const SourcesFile = z
  .object({ sources: z.array(Source).min(1) })
  .strict()
  .superRefine((file, ctx) => {
    const seen = new Set<string>();
    file.sources.forEach((s, i) => {
      if (seen.has(s.id)) {
        ctx.addIssue({ code: 'custom', path: ['sources', i, 'id'], message: `duplicate id "${s.id}"` });
      }
      seen.add(s.id);
    });
  });
export type SourcesFile = z.infer<typeof SourcesFile>;

/** Never changed by the system (FR-013a). */
export const InterestProfile = z
  .object({
    priorityTechnologies: z.array(z.string().min(1)),
    ignoredTopics: z.array(z.string().min(1)).default([]),
    updatedAt: z.string(),
  })
  .strict();
export type InterestProfile = z.infer<typeof InterestProfile>;

export const ScheduleSettings = z
  .object({
    enabled: z.boolean().default(false),
    generationTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'must be HH:mm')
      .default('08:00'),
    timeZone: z.string().optional(),
  })
  .strict();
export type ScheduleSettings = z.infer<typeof ScheduleSettings>;

export const SettingsFile = z.object({ schedule: ScheduleSettings }).strict();
export type SettingsFile = z.infer<typeof SettingsFile>;
