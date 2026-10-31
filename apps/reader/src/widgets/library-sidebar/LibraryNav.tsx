import type { Library } from '@/entities/document';
import { messages } from '@/shared/config/messages';
import { NavGroup } from './components/NavGroup';

export function LibraryNav({ library }: { library: Library }) {
  return (
    <nav aria-label={messages.library} className="space-y-4">
      {library.domains.map((domain) => (
        <section key={domain.id} aria-label={domain.name}>
          <h2 className="px-2 pb-1 text-sm font-semibold">{domain.name}</h2>
          <NavGroup title={messages.groups.lessons} documents={domain.lessons} />
          <NavGroup title={messages.groups.research} documents={domain.research} />
          <NavGroup title={messages.groups.other} documents={domain.other} />
        </section>
      ))}
      <NavGroup title={messages.groups.news} documents={library.news} />
      <NavGroup title={messages.groups.unsorted} documents={library.unsorted} />
    </nav>
  );
}
