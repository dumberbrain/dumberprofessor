import { notFound } from 'next/navigation';
import { groupLibrary, neighbours } from '@/entities/document';
import { getDocument, listDocuments } from '@/entities/document/server';
import { getDomainNames } from '@/entities/domain/server';
import { DocumentArticle } from '@/widgets/document-article';
import { DocumentPager } from '@/widgets/document-pager';

export async function DocumentView({ slug }: { slug: string[] }) {
  const [document, documents, names] = await Promise.all([getDocument(slug), listDocuments(), getDomainNames()]);
  if (!document) notFound();
  const { previous, next } = neighbours(groupLibrary(documents, names), document.path);
  return (
    <div className="mx-auto max-w-3xl">
      <DocumentArticle
        document={document}
        domainName={document.domain ? (names[document.domain] ?? document.domain) : null}
      />
      <DocumentPager previous={previous} next={next} />
    </div>
  );
}
