import { messages } from '@/shared/config/messages';
import { safeHref } from '@/shared/lib/safe-href';

export function DocumentSources({ sources }: { sources: string[] }) {
  const links = sources.map((s) => safeHref(s)).filter((s): s is string => s !== null);
  if (links.length === 0) return null;
  return (
    <section aria-labelledby="sources" className="mt-10 border-t pt-6">
      <h2 id="sources" className="mb-2 font-semibold">
        {messages.sources}
      </h2>
      <ul className="list-disc space-y-1 ps-5 text-sm break-all">
        {links.map((href) => (
          <li key={href}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4"
            >
              {href}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
