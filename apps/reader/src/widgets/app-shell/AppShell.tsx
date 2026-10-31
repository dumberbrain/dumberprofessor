import type { ReactNode } from 'react';
import { groupLibrary } from '@/entities/document';
import { listDocuments } from '@/entities/document/server';
import { getDomainNames } from '@/entities/domain/server';
import { SearchForm } from '@/features/search-documents';
import { ThemeToggle } from '@/features/toggle-theme';
import { LibraryNav, MobileLibraryNav } from '@/widgets/library-sidebar';
import { SiteHeader } from '@/widgets/site-header';

/** Header + library sidebar around every page; the library is read on each request. */
export async function AppShell({ children }: { children: ReactNode }) {
  const [documents, names] = await Promise.all([listDocuments(), getDomainNames()]);
  const nav = <LibraryNav library={groupLibrary(documents, names)} />;
  return (
    <>
      <SiteHeader
        mobileNav={<MobileLibraryNav>{nav}</MobileLibraryNav>}
        actions={
          <>
            <SearchForm className="hidden w-64 sm:flex" />
            <ThemeToggle />
          </>
        }
      />
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
