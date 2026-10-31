import type { Library } from '@/entities/document';
import { messages } from '@/shared/config/messages';
import { DocumentList } from './components/DocumentList';

export function LibraryOverview({ library }: { library: Library }) {
  if (library.total === 0) {
    return <p className="rounded-md border p-6 text-muted-foreground">{messages.emptyLibrary}</p>;
  }
  return (
    <div className="space-y-10">
      {library.domains.map((domain) => (
        <section key={domain.id} aria-labelledby={`domain-${domain.id}`}>
          <h2 id={`domain-${domain.id}`} className="text-xl font-semibold">
            {domain.name}
          </h2>
          <DocumentList title={messages.groups.lessons} documents={domain.lessons} />
          <DocumentList title={messages.groups.research} documents={domain.research} />
          <DocumentList title={messages.groups.other} documents={domain.other} />
        </section>
      ))}
      {library.news.length > 0 && (
        <section aria-labelledby="news">
          <h2 id="news" className="text-xl font-semibold">
            {messages.groups.news}
          </h2>
          <DocumentList documents={library.news} />
        </section>
      )}
      <DocumentList title={messages.groups.unsorted} documents={library.unsorted} />
    </div>
  );
}
