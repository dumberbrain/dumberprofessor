import type { Metadata } from 'next';
import { z } from 'zod';
import { messages } from '@/shared/config/messages';
import { SearchView } from '@/views/search';

const Query = z.object({
  q: z.string().max(200).optional().catch(undefined),
  domain: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional()
    .catch(undefined),
  type: z.enum(['lesson', 'research', 'news']).optional().catch(undefined),
});

export const metadata: Metadata = { title: messages.search.label };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  const raw = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  return <SearchView query={Query.parse({ q: first(raw.q), domain: first(raw.domain), type: first(raw.type) })} />;
}
