import { DocumentMeta, DocumentSources, showToc, tableOfContents, type DocumentFile } from '@/entities/document';
import { TableOfContents } from './components/TableOfContents';
import { renderMarkdown } from './lib/render-markdown';

/** The leading `# title` duplicates the header built from front matter. */
const withoutTitle = (body: string) => body.replace(/^\s*#\s+.+\r?\n/, '');

export async function DocumentArticle({ document, domainName }: { document: DocumentFile; domainName: string | null }) {
  const body = withoutTitle(document.body);
  const toc = tableOfContents(body);
  return (
    <article>
      <DocumentMeta document={document} domainName={domainName} />
      {showToc(toc) && <TableOfContents items={toc} />}
      <div className="prose max-w-none prose-neutral dark:prose-invert prose-pre:bg-transparent prose-pre:p-0">
        {await renderMarkdown(body, document.path)}
      </div>
      <DocumentSources sources={document.sources} />
    </article>
  );
}
