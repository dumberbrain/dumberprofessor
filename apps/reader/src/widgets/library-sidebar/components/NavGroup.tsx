import type { DocumentFile } from '@/entities/document';
import { NavLink } from '@/shared/ui/nav-link';

export function NavGroup({ title, documents }: { title: string; documents: DocumentFile[] }) {
  if (documents.length === 0) return null;
  return (
    <details className="group" open>
      <summary className="cursor-pointer px-2 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title} <span className="font-normal">({documents.length})</span>
      </summary>
      <ul className="mt-1 space-y-0.5">
        {documents.map((d) => (
          <li key={d.path}>
            <NavLink href={d.href}>{d.title}</NavLink>
          </li>
        ))}
      </ul>
    </details>
  );
}
