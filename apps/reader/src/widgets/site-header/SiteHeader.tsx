import Link from 'next/link';
import type { ReactNode } from 'react';
import { messages } from '@/shared/config/messages';

/** Top bar: mobile navigation trigger, home link and action slots (search, theme). */
export function SiteHeader({ mobileNav, actions }: { mobileNav: ReactNode; actions?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        {mobileNav}
        <Link href="/" className="font-semibold tracking-tight">
          {messages.appTitle}
        </Link>
        <div className="ms-auto flex items-center gap-2">{actions}</div>
      </div>
    </header>
  );
}
