import matter from 'gray-matter';
import { z } from 'zod';
import { DOCUMENT_TYPES } from './types';

const isoDate = z.union([
  z.date().transform((d) => d.toISOString().slice(0, 10)),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
]);

/** Front matter written by `fp doc` (feature 002). Unknown keys are ignored. */
const FrontMatter = z.object({
  title: z.string().min(1),
  type: z.enum(DOCUMENT_TYPES),
  domain: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .optional(),
  date: isoDate,
  sources: z
    .array(z.unknown())
    .optional()
    .transform((list) =>
      (list ?? []).filter((s): s is string => typeof s === 'string' && z.url().safeParse(s).success),
    ),
});
export type FrontMatter = z.infer<typeof FrontMatter>;

export function parseDocumentSource(raw: string): { meta: FrontMatter | null; body: string } {
  let parsed: matter.GrayMatterFile<string>;
  try {
    // An empty options object disables gray-matter's cache, which would return stale results.
    parsed = matter(raw, {});
  } catch {
    return { meta: null, body: raw };
  }
  const result = FrontMatter.safeParse(parsed.data);
  return { meta: result.success ? result.data : null, body: parsed.content };
}
