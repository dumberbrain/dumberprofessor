import { posix } from 'node:path';

export function pathToSlug(path: string): string[] {
  return path.replace(/\.md$/i, '').split('/');
}

/** URL segments (possibly percent-encoded) → library path. */
export function slugToPath(slug: string[]): string {
  return `${slug.map((s) => decodeURIComponent(s)).join('/')}.md`;
}

export function hrefFor(path: string): string {
  return `/docs/${pathToSlug(path).map(encodeURIComponent).join('/')}`;
}

/** A relative link to another Markdown document, resolved against the current document's path. */
export function resolveRelative(fromPath: string, link: string): { path: string; hash: string } | null {
  const [target = '', hash = ''] = link.split(/(?=#)/);
  if (!/\.md$/i.test(target)) return null;
  const joined = posix.normalize(posix.join(posix.dirname(fromPath), decodeURIComponent(target)));
  if (joined.startsWith('..') || posix.isAbsolute(joined)) return null;
  return { path: joined, hash };
}
