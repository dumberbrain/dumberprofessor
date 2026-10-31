import Link from 'next/link';
import type { DocumentFile } from '@/entities/document';
import { messages } from '@/shared/config/messages';
import { Badge } from '@/shared/ui';

export function DocumentList({ title, documents }: { title?: string; documents: DocumentFile[] }) {
  if (documents.length === 0) return null;
  return (
    <section className="mt-4">
      {title && <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{title}</h3>}
      <ul className="divide-y rounded-md border">
        {documents.map((d) => (
          <li key={d.path} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3">
            <Link href={d.href as never} className="font-medium hover:underline">
              {d.title}
            </Link>
            {d.missingMetadata && <Badge variant="warning">{messages.missingMetadata}</Badge>}
            {d.date && (
              <time dateTime={d.date} className="ms-auto text-sm text-muted-foreground">
                {d.date}
              </time>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
