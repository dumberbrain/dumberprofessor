import type { TocItem } from '@/entities/document';
import { messages } from '@/shared/config/messages';
import { cn } from '@/shared/lib/cn';

export function TableOfContents({ items }: { items: TocItem[] }) {
  return (
    <nav aria-labelledby="toc" className="mb-8 rounded-md border bg-muted/40 p-4 text-sm">
      <h2 id="toc" className="mb-2 font-semibold">
        {messages.toc}
      </h2>
      <ol className="space-y-1">
        {items.map((item) => (
          <li key={item.id} className={cn(item.depth === 3 && 'ps-4')}>
            <a
              href={`#${encodeURIComponent(item.id)}`}
              className="text-muted-foreground hover:text-foreground hover:underline"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
