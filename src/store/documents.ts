import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { parse, stringify } from 'yaml';
import { exists, writeAtomic } from './fs.js';

// The user's Markdown library: documents/<domain>/<lessons|research>/<date>-<slug>.md,
// documents/news/<date>.md and a generated documents/README.md index.

export const DOC_TYPES = ['lesson', 'research'] as const;
export type DocType = (typeof DOC_TYPES)[number];

const FOLDER: Record<DocType, string> = { lesson: 'lessons', research: 'research' };
const HEADING: Record<DocType | 'news', string> = { lesson: 'Dərslər', research: 'Araşdırmalar', news: 'Xəbərlər' };

/** Root of the library; FP_DOCS_DIR overrides (tests). */
export function docsRoot(dir = 'documents'): string {
  return resolve(process.env.FP_DOCS_DIR ?? dir);
}

const AZ: Record<string, string> = { ə: 'e', ı: 'i', ö: 'o', ü: 'u', ç: 'c', ş: 's', ğ: 'g' };

export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[əıöüçşğ]/g, (c) => AZ[c]!)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  return slug || 'document';
}

export interface DocMeta {
  title: string;
  type: DocType | 'news';
  domain?: string;
  date: string;
  sources?: string[];
}

function withFrontmatter(meta: DocMeta, body: string): string {
  const fm = stringify(Object.fromEntries(Object.entries(meta).filter(([, v]) => v !== undefined && !(Array.isArray(v) && !v.length))));
  return `---\n${fm}---\n\n${body.trim()}\n`;
}

function readFrontmatter(text: string): DocMeta | null {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return null;
  const meta = parse(m[1]!) as Partial<DocMeta> | null;
  return meta?.title && meta.type && meta.date ? (meta as DocMeta) : null;
}

/** Writes a lesson or research document; never overwrites (adds -2, -3 … to the name). */
export async function saveDocument(root: string, meta: DocMeta & { type: DocType; domain: string }, body: string): Promise<string> {
  const dir = join(root, meta.domain, FOLDER[meta.type]);
  await mkdir(dir, { recursive: true });
  const base = `${meta.date}-${slugify(meta.title)}`;
  let path = join(dir, `${base}.md`);
  for (let n = 2; await exists(path); n++) path = join(dir, `${base}-${n}.md`);
  await writeFile(path, withFrontmatter(meta, body), { encoding: 'utf8', flag: 'wx' });
  return path;
}

/** Copy of a stored daily report (rendered Markdown); refreshed when addenda arrive. */
export async function saveNewsDocument(root: string, date: string, markdown: string): Promise<string> {
  const path = join(root, 'news', `${date}.md`);
  await writeAtomic(path, withFrontmatter({ title: `Gündəlik hesabat — ${date}`, type: 'news', date }, markdown));
  return path;
}

/** All .md files under `dir` except the index. */
async function walk(dir: string, root = dir): Promise<string[]> {
  if (!(await exists(dir))) return [];
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path, root)));
    else if (entry.name.endsWith('.md') && path !== join(root, 'README.md')) out.push(path);
  }
  return out;
}

export interface DocEntry extends DocMeta {
  path: string;
}

export async function listDocuments(root: string): Promise<DocEntry[]> {
  const entries: DocEntry[] = [];
  for (const path of await walk(root)) {
    const meta = readFrontmatter(await readFile(path, 'utf8'));
    if (meta) entries.push({ ...meta, path: relative(root, path).replace(/\\/g, '/') });
  }
  return entries.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

/** documents/README.md: by domain, then type, newest first; news last. */
export async function writeIndex(root: string, domainNames: Record<string, string>): Promise<string> {
  const docs = await listDocuments(root);
  const link = (d: DocEntry) => `- ${d.date} — [${d.title}](${encodeURI(d.path)})`;
  const lines = [
    '# Sənədlər',
    '',
    'Öyrəndiklərin və araşdırdıqların. Bu fayl avtomatik yaranır (`npm run fp -- doc index`), əl ilə dəyişmə.',
    '',
  ];
  const domains = [...new Set(docs.filter((d) => d.domain).map((d) => d.domain!))].sort(
    (a, b) => (domainNames[a] ?? a).localeCompare(domainNames[b] ?? b),
  );
  for (const domain of domains) {
    lines.push(`## ${domainNames[domain] ?? domain}`, '');
    for (const type of DOC_TYPES) {
      const group = docs.filter((d) => d.domain === domain && d.type === type);
      if (group.length) lines.push(`### ${HEADING[type]}`, '', ...group.map(link), '');
    }
  }
  const news = docs.filter((d) => d.type === 'news');
  if (news.length) lines.push(`## ${HEADING.news}`, '', ...news.map(link), '');
  if (docs.length === 0) lines.push('_Hələ sənəd yoxdur._', '');
  const path = join(root, 'README.md');
  await writeAtomic(path, lines.join('\n'));
  return path;
}
