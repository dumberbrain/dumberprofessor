import { messages } from '@/shared/config/messages';
import { Badge } from '@/shared/ui';
import type { DocumentFile } from '../model/types';

/** Front matter as a header (FR-002); the domain name comes from the configuration. */
export function DocumentMeta({ document, domainName }: { document: DocumentFile; domainName: string | null }) {
  return (
    <header className="mb-8 border-b pb-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge>{messages.types[document.type]}</Badge>
        {domainName && <span>{domainName}</span>}
        {document.date && <time dateTime={document.date}>{document.date}</time>}
        {document.missingMetadata && <Badge variant="warning">{messages.missingMetadata}</Badge>}
      </div>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-balance">{document.title}</h1>
    </header>
  );
}
