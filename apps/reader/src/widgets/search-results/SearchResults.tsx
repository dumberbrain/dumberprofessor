import Link from 'next/link';
import type { SearchResult } from '@/entities/document';
import { messages } from '@/shared/config/messages';
import { Badge } from '@/shared/ui';
import { Highlight } from './components/Highlight';

export function SearchResults({
  results,
  query,
  names,
}: {
  results: SearchResult[];
  query: string;
  names: Record<string, string>;
}) {
  if (results.length === 0)
    return <p className="rounded-md border p-6 text-muted-foreground">{messages.search.empty}</p>;
  return (
    <section aria-label={messages.search.results(results.length)}>
      <p role="status" className="mb-4 text-sm text-muted-foreground">
        {messages.search.results(results.length)}
      </p>
      <ol className="space-y-4">
        {results.map(({ document: d, snippet }) => (
          <li key={d.path} className="rounded-md border p-4">
            <Link href={d.href as never} className="text-lg font-medium hover:underline">
              <Highlight text={d.title} query={query} />
            </Link>
            <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">
              <Badge>{messages.types[d.type]}</Badge>
              {d.domain && <span>{names[d.domain] ?? d.domain}</span>}
              {d.date && <time dateTime={d.date}>{d.date}</time>}
            </div>
            {snippet && (
              <p className="mt-2 text-sm">
                <Highlight text={snippet} query={query} />
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
