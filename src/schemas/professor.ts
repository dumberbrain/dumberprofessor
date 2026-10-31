import { z } from 'zod';
import { Tier } from './enums.js';

// config/professor.json — edited by hand. Descriptions end up in config/professor.schema.json
// (`fp config schema`), so they are written for the user.

const Id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be kebab-case');

export const Depth = z
  .enum(['beginner', 'intermediate', 'advanced', 'expert'])
  .describe('How deep lessons and explanations go');
export type Depth = z.infer<typeof Depth>;

export const DomainKind = z
  .enum(['technical', 'language', 'general'])
  .describe('technical: software/engineering · language: e.g. English · general: any other field');

export const CefrLevel = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).describe('Language domains: your CEFR level');

export const QuestionType = z.enum([
  'conceptual',
  'code-reading',
  'debugging',
  'implementation',
  'comparison',
  'vocabulary',
  'grammar',
  'translation',
  'writing',
]);
export type QuestionType = z.infer<typeof QuestionType>;

/** Question types that only make sense for one kind of domain; the rest fit every kind. */
export const QUESTION_KINDS: Partial<Record<QuestionType, z.infer<typeof DomainKind>>> = {
  'code-reading': 'technical',
  debugging: 'technical',
  implementation: 'technical',
  vocabulary: 'language',
  grammar: 'language',
  translation: 'language',
  writing: 'language',
};

export const ProfessorDomain = z
  .object({
    id: Id.describe('kebab-case identifier, referenced by focus and sources'),
    name: z.string().min(1),
    description: z.string().min(1).describe('What this domain covers'),
    kind: DomainKind.default('technical'),
    depth: Depth.default('intermediate'),
    level: CefrLevel.optional(),
    priorityTopics: z.array(z.string().min(1)).default([]),
    curriculum: z
      .array(z.string().min(1))
      .default([])
      .describe('Ordered lesson topics. Empty: the Professor proposes topics from sources'),
  })
  .strict()
  .describe('A field you want to learn — any field');
export type ProfessorDomain = z.infer<typeof ProfessorDomain>;

export const SourceKind = z.enum([
  'rss',
  'web',
  'hn',
  'github-advisories',
  'youtube-channel',
  'docs',
  'github',
  'youtube-video',
  'youtube-playlist',
]);
export type SourceKind = z.infer<typeof SourceKind>;

/** Kinds the news collector can read (feature 001 adapters). */
export const NEWS_KINDS: readonly SourceKind[] = ['rss', 'web', 'hn', 'github-advisories', 'youtube-channel'];

const integration = (description: string) => z.string().min(1).default('unspecified').describe(description);

export const ProfessorSource = z
  .object({
    id: Id,
    kind: SourceKind,
    url: z.url(),
    tier: Tier.describe('1 primary/official · 2 technical analysis · 3 community · 4 learning resource'),
    domains: z.array(Id).min(1),
    use: z
      .array(z.enum(['news', 'lessons']))
      .min(1)
      .default(['lessons'])
      .describe('news: collected for the daily report · lessons: used to teach and answer'),
    name: z.string().min(1).optional(),
    enabled: z.boolean().default(true),
    channelId: z.string().nullable().optional().describe('youtube-channel: filled by `fp sources resolve`'),
    params: z.record(z.string(), z.unknown()).optional().describe('Collector options (e.g. minPoints, ecosystem)'),
    purpose: integration('Why this source is configured'),
    updateFrequency: integration('How often it publishes'),
    reliability: integration('How far it can be trusted'),
    limitations: integration('Known limitations'),
    failureBehavior: integration('What happens when it is unavailable'),
    note: z.string().optional(),
  })
  .strict();
export type ProfessorSource = z.infer<typeof ProfessorSource>;

export const SessionAction = z.enum(['news', 'lesson', 'review', 'english']);

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const ProfessorConfig = z
  .object({
    $schema: z.string().optional(),
    language: z
      .object({
        output: z.string().min(2).default('az').describe('Answer language, e.g. az, en'),
        keepTermsInEnglish: z.boolean().default(true).describe('Keep technical terms and titles in English'),
      })
      .strict()
      .default({ output: 'az', keepTermsInEnglish: true }),
    focus: z
      .array(Id)
      .default([])
      .describe('Ordered domain ids to prioritize (earlier weighs more). Empty: all domains equal. Also: fp focus set|clear'),
    domains: z.array(ProfessorDomain).min(1),
    sources: z.array(ProfessorSource).default([]).describe('Where to learn from and collect news from'),
    ranking: z
      .object({
        priorityTechnologies: z.array(z.string().min(1)).default([]).describe('News ranking: earlier entries weigh more'),
        ignoredTopics: z
          .array(z.string().min(1))
          .default([])
          .describe('News matching only these topics is dropped (security advisories are always kept)'),
      })
      .strict()
      .default({ priorityTechnologies: [], ignoredTopics: [] }),
    extraSources: z
      .object({
        allowed: z.enum(['never', 'ask', 'always']).default('ask').describe('May the Professor search beyond your sources?'),
        maxFetchesPerAnswer: z
          .number()
          .int()
          .min(0)
          .max(10)
          .default(3)
          .describe('Upper bound on pages read per answer (token budget)'),
      })
      .strict()
      .default({ allowed: 'ask', maxFetchesPerAnswer: 3 }),
    sessionStart: z
      .object({
        mode: z
          .enum(['ask', 'actions', 'off'])
          .default('ask')
          .describe('ask: ask what you want · actions: run enabled actions in order · off: nothing'),
        actions: z
          .array(z.object({ type: SessionAction, enabled: z.boolean().default(true) }).strict())
          .default([])
          .describe('In ask mode: the menu. In actions mode: run in this order'),
      })
      .strict()
      .default({ mode: 'ask', actions: [] })
      .describe('What happens when a Claude Code session starts'),
    lesson: z
      .object({
        quizQuestions: z.number().int().min(0).max(10).default(3).describe('Questions at the end of each lesson'),
        questionTypes: z
          .array(QuestionType)
          .min(1)
          .default(['conceptual', 'code-reading'])
          .describe('Types that do not fit a domain kind are skipped for it'),
        revealAnswersAfterAttempt: z.boolean().default(true),
        style: z.enum(['concise', 'detailed']).default('concise').describe('concise uses fewer tokens'),
      })
      .strict()
      .default({
        quizQuestions: 3,
        questionTypes: ['conceptual', 'code-reading'],
        revealAnswersAfterAttempt: true,
        style: 'concise',
      }),
    documents: z
      .object({
        autoSave: z
          .boolean()
          .default(true)
          .describe('Save every lesson, research answer and daily report as Markdown'),
        dir: z.string().min(1).default('documents').describe('Folder for the Markdown documents, relative to the project'),
      })
      .strict()
      .default({ autoSave: true, dir: 'documents' })
      .describe('Your library of lessons, research and news (Markdown)'),
    schedule: z
      .object({
        enabled: z.boolean().default(false).describe('Set only by `fp schedule enable|disable`'),
        generationTime: z.string().regex(HHMM, 'must be HH:mm').default('08:00'),
        timeZone: z.string().optional().describe('IANA zone, e.g. Asia/Baku; default: system zone'),
      })
      .strict()
      .default({ enabled: false, generationTime: '08:00' })
      .describe('Daily news report schedule'),
  })
  .strict()
  .superRefine((cfg, ctx) => {
    const ids = cfg.domains.map((d) => d.id);
    const unknown = (path: (string | number)[], id: string) =>
      ctx.addIssue({ code: 'custom', path, message: `unknown domain "${id}"${hint(id, ids)}` });
    duplicates(ids).forEach((i) => ctx.addIssue({ code: 'custom', path: ['domains', i, 'id'], message: 'duplicate id' }));
    duplicates(cfg.sources.map((s) => s.id)).forEach((i) =>
      ctx.addIssue({ code: 'custom', path: ['sources', i, 'id'], message: 'duplicate id' }),
    );
    cfg.focus.forEach((id, i) => ids.includes(id) || unknown(['focus', i], id));
    cfg.sources.forEach((s, i) => {
      s.domains.forEach((id, j) => ids.includes(id) || unknown(['sources', i, 'domains', j], id));
      if (s.use.includes('news') && !NEWS_KINDS.includes(s.kind)) {
        ctx.addIssue({
          code: 'custom',
          path: ['sources', i, 'use'],
          message: `kind "${s.kind}" cannot be collected as news (news kinds: ${NEWS_KINDS.join(', ')})`,
        });
      }
    });
  })
  .describe('Professor configuration — edited by hand. Validate with: npm run fp -- config check');
export type ProfessorConfig = z.infer<typeof ProfessorConfig>;

function duplicates(values: string[]): number[] {
  return values.flatMap((v, i) => (values.indexOf(v) < i ? [i] : []));
}

/** " (did you mean "backend"?)" when a configured id is within edit distance 2. */
export function hint(id: string, known: string[]): string {
  const best = known
    .map((k) => ({ k, d: distance(id, k) }))
    .sort((a, b) => a.d - b.d)[0];
  return best && best.d <= 2 ? ` (did you mean "${best.k}"?)` : ` (configured: ${known.join(', ')})`;
}

function distance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length]!;
}
