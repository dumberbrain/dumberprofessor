import type { ReactNode } from 'react';
import { groupLibrary } from '@/entities/document';
import { listDocuments } from '@/entities/document/server';
import { getDomainNames } from '@/entities/domain/server';
import { LibraryNav, MobileLibraryNav } from '@/widgets/library-sidebar';
import { SiteHeader } from '@/widgets/site-header';

/** Header + library sidebar around every page; the library is read on each request. */
export async function AppShell({ actions, children }: { actions?: ReactNode; children: ReactNode }) {
  const [documents, names] = await Promise.all([listDocuments(), getDomainNames()]);
  const library = groupLibrary(documents, names);
  const nav = <LibraryNav library={library} />;
  return (
    <>
      <SiteHeader mobileNav={<MobileLibraryNav>{nav}</MobileLibraryNav>} actions={actions} />
      <div className="mx-auto flex max-w-7xl gap-8 px-4">
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-72 shrink-0 overflow-y-auto py-6 lg:block">
          {nav}
        </aside>
        <main id="content" className="min-w-0 flex-1 py-8">
          {children}
        </main>
      </div>
    </>
  );
}
