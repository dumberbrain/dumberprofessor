import GithubSlugger from 'github-slugger';
import type { TocItem } from '../model/types';

const plain = (text: string) =>
  text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .trim();

/** Headings in document order with the ids rehype-slug gives them (same slugger, same sequence). */
export function tableOfContents(markdown: string): TocItem[] {
  const slugger = new GithubSlugger();
  const items: TocItem[] = [];
  let fenced = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const m = fenced ? null : /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const text = plain(m[2]!);
    const id = slugger.slug(text);
    const depth = m[1]!.length;
    if (depth === 2 || depth === 3) items.push({ id, text, depth });
  }
  return items;
}

/** FR-013: a table of contents only pays off with three or more sections. */
export const showToc = (items: TocItem[]) => items.filter((i) => i.depth === 2).length >= 3;
