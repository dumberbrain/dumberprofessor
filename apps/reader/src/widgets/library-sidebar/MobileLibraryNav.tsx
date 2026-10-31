'use client';

import { Menu } from 'lucide-react';
import type { ReactNode } from 'react';
import { messages } from '@/shared/config/messages';
import { Sheet, SheetContent, SheetTrigger } from '@/shared/ui/sheet';

/** Drawer for small screens; the navigation itself is rendered on the server and passed as children. */
export function MobileLibraryNav({ children }: { children: ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger
        aria-label={messages.openLibrary}
        className="rounded-md p-2 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:hidden"
      >
        <Menu className="size-5" aria-hidden />
      </SheetTrigger>
      <SheetContent title={messages.library} closeLabel={messages.close}>
        {children}
      </SheetContent>
    </Sheet>
  );
}
