import Link from 'next/link';
import type { ComponentProps } from 'react';
import { hrefFor, resolveRelative } from '@/entities/document';
import { isExternal, safeHref } from '@/shared/lib/safe-href';

type Props = ComponentProps<'a'> & { currentPath: string; node?: unknown };

/** Internal document links stay in the reader, external ones open in a new tab, unsafe ones become text. */
export function MarkdownLink({ href, children, currentPath, node: _node, ...rest }: Props) {
  const safe = safeHref(href);
  if (!safe) return <span>{children}</span>;
  const internal = resolveRelative(currentPath, safe);
  if (internal) {
    return (
      <Link href={`${hrefFor(internal.path)}${internal.hash}` as never} {...rest}>
        {children}
      </Link>
    );
  }
  if (isExternal(safe)) {
    return (
      <a href={safe} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return safe.startsWith('#') ? (
    <a href={safe} {...rest}>
      {children}
    </a>
  ) : (
    <span>{children}</span>
  );
}
