import { groupLibrary } from '@/entities/document';
import { listDocuments } from '@/entities/document/server';
import { getDomainNames } from '@/entities/domain/server';
import { messages } from '@/shared/config/messages';
import { LibraryOverview } from '@/widgets/library-overview';

export async function HomeView() {
  const [documents, names] = await Promise.all([listDocuments(), getDomainNames()]);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">{messages.library}</h1>
      <LibraryOverview library={groupLibrary(documents, names)} />
    </div>
  );
}
