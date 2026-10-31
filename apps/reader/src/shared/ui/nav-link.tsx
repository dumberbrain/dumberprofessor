'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/** Link that marks itself as the current page (aria-current) — the only client part of the sidebar. */
export function NavLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const current = decodeURIComponent(usePathname()) === decodeURIComponent(href);
  return (
    <Link
      href={href as never}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'block truncate rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground',
        current && 'bg-accent font-medium text-foreground',
        className,
      )}
    >
      {children}
    </Link>
  );
}
