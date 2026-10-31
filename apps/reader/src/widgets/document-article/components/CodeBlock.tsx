import type { ComponentProps } from 'react';
import { CopyCodeButton } from '@/features/copy-code';

interface HastNode {
  type: string;
  value?: string;
  children?: HastNode[];
}

const textOf = (node: HastNode | undefined): string =>
  !node ? '' : node.type === 'text' ? (node.value ?? '') : (node.children ?? []).map(textOf).join('');

/** <pre> with a copy button; the code text is taken from the syntax tree. */
export function CodeBlock({ node, className, ...props }: ComponentProps<'pre'> & { node?: HastNode }) {
  return (
    <div className="relative">
      <pre className={className} {...props} />
      <CopyCodeButton code={textOf(node)} />
    </div>
  );
}
