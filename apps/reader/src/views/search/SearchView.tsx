import { searchDocuments, type SearchQuery } from '@/entities/document';
import { listDocuments } from '@/entities/document/server';
import { getDomainNames } from '@/entities/domain/server';
import { SearchForm } from '@/features/search-documents';
import { messages } from '@/shared/config/messages';
import { SearchResults } from '@/widgets/search-results';

export async function SearchView({ query }: { query: SearchQuery }) {
  const [documents, names] = await Promise.all([listDocuments(), getDomainNames()]);
  const domains = [...new Set(documents.map((d) => d.domain).filter((d): d is string => d !== null))]
    .map((id) => ({ id, name: names[id] ?? id }))
    .sort((a, b) => a.name.localeCompare(b.name, 'az'));
  const searched = Boolean(query.q || query.domain || query.type);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">{messages.search.label}</h1>
      <SearchForm q={query.q} domain={query.domain} type={query.type} domains={domains} className="mb-8" />
      {searched && <SearchResults results={searchDocuments(documents, query)} query={query.q ?? ''} names={names} />}
    </div>
  );
}
