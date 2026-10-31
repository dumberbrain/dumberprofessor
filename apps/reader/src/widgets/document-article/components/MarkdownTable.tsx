import type { ComponentProps } from 'react';
import { messages } from '@/shared/config/messages';

/** Wide tables scroll inside their box instead of widening the page (FR-015). */
export function MarkdownTable({ node: _node, ...props }: ComponentProps<'table'> & { node?: unknown }) {
  return (
    <div className="my-6 overflow-x-auto" tabIndex={0} role="region" aria-label={messages.tableRegion}>
      <table className="my-0" {...props} />
    </div>
  );
}
