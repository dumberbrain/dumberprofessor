import Link from 'next/link';
import type { DocumentFile } from '@/entities/document';
import { messages } from '@/shared/config/messages';

export function DocumentPager({ previous, next }: { previous: DocumentFile | null; next: DocumentFile | null }) {
  if (!previous && !next) return null;
  return (
    <nav
      aria-label={`${messages.previous} / ${messages.next}`}
      className="mt-10 grid gap-3 border-t pt-6 sm:grid-cols-2"
    >
      {previous ? (
        <Link href={previous.href as never} className="rounded-md border p-3 hover:bg-accent">
          <span className="block text-xs text-muted-foreground">← {messages.previous}</span>
          {previous.title}
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link href={next.href as never} className="rounded-md border p-3 text-end hover:bg-accent">
          <span className="block text-xs text-muted-foreground">{messages.next} →</span>
          {next.title}
        </Link>
      )}
    </nav>
  );
}
