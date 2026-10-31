import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { renderMarkdown } from './render-markdown';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const fixture = (path: string) =>
  readFileSync(resolve(__dirname, '../../../../e2e/fixtures/documents', path), 'utf8').replace(/^---[\s\S]*?---\n/, '');
const html = async (path: string) => renderToStaticMarkup(await renderMarkdown(fixture(path), path));

describe('renderMarkdown', () => {
  it('renders nothing executable from untrusted content', async () => {
    const out = await html('malicious.md');
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toMatch(/onerror/i);
    expect(out).not.toMatch(/javascript:/i);
    expect(out).toContain('click');
  });

  it('turns relative document links into reader links and opens external links in a new tab', async () => {
    const out = await html('security/lessons/2026-10-30-xss-basics.md');
    expect(out).toContain('href="/docs/security/research/2026-10-31-csp"');
    expect(out).toMatch(/<a href="https:\/\/owasp\.org\/" target="_blank" rel="noopener noreferrer"/);
  });

  it('renders GFM tables inside a scroll container and highlights code', async () => {
    const out = await html('security/lessons/2026-10-30-xss-basics.md');
    expect(out).toMatch(/<div[^>]*overflow-x-auto[^>]*><table/);
    expect(out).toContain('data-rehype-pretty-code-figure');
    expect(out).toContain('--shiki-dark');
  });

  it('adds heading ids for the table of contents', async () => {
    expect(await html('security/lessons/2026-10-30-xss-basics.md')).toContain('<h2 id="nümunə"');
  });
});
