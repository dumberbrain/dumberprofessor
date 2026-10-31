import { MarkdownAsync } from 'react-markdown';
import { rehypePrettyCode } from 'rehype-pretty-code';
import rehypeSanitize from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from '../components/CodeBlock';
import { MarkdownLink } from '../components/MarkdownLink';
import { MarkdownTable } from '../components/MarkdownTable';

/**
 * Markdown → React elements on the server (no dangerouslySetInnerHTML). Raw HTML is never parsed
 * into elements; the untrusted tree is sanitized BEFORE trusted markup (heading ids, highlighting) is added.
 */
export function renderMarkdown(markdown: string, currentPath: string) {
  return MarkdownAsync({
    children: markdown,
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSanitize,
      rehypeSlug,
      [
        rehypePrettyCode,
        { theme: { light: 'github-light-high-contrast', dark: 'github-dark-high-contrast' }, keepBackground: false },
      ],
    ],
    components: {
      a: (props) => <MarkdownLink currentPath={currentPath} {...props} />,
      pre: CodeBlock as never,
      table: MarkdownTable,
    },
  });
}
