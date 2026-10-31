import { readFile, rm } from 'node:fs/promises';
import { relative } from 'node:path';
import { loadSettings } from '../config/load.js';
import { loadProfessor } from '../config/professor.js';
import { localDate } from '../lib/time.js';
import { renderReport } from '../report/render-md.js';
import { hint } from '../schemas/professor.js';
import { DOC_TYPES, docsRoot, listDocuments, saveDocument, saveNewsDocument, writeIndex, type DocType } from '../store/documents.js';
import { dataRoot } from '../store/fs.js';
import { getReport } from '../store/reports.js';
import { CliError, EXIT, flag, type Command } from './args.js';
import { resolveReportDate } from './report.js';

async function library() {
  const cfg = await loadProfessor();
  return {
    cfg,
    root: docsRoot(cfg.documents.dir),
    names: Object.fromEntries(cfg.domains.map((d) => [d.id, d.name])),
  };
}

const shown = (path: string) => relative(process.cwd(), path).replace(/\\/g, '/');

/** Copies a stored daily report into documents/news/ and refreshes the index. null → autoSave off or no report. */
export async function exportNews(date: string, opts: { force?: boolean } = {}): Promise<string | null> {
  const { cfg, root, names } = await library();
  if (!cfg.documents.autoSave && !opts.force) return null;
  const found = await getReport(date);
  if (!found) return null;
  const path = await saveNewsDocument(root, date, renderReport(found.report, found.addenda));
  await writeIndex(root, names);
  return path;
}

/**
 * fp doc save --type lesson|research --domain <id> --title <text> [--sources "url; url"] [--auto] <draft.md>
 * The draft (written by a skill, usually under data/drafts/) is moved into the library.
 */
const save: Command = async (args) => {
  const { cfg, root, names } = await library();
  const type = flag(args, 'type') as DocType | undefined;
  const domain = flag(args, 'domain');
  const title = flag(args, 'title');
  const draft = args.positional[0];
  if (!type || !DOC_TYPES.includes(type) || !domain || !title || !draft) {
    throw new CliError(`usage: fp doc save --type ${DOC_TYPES.join('|')} --domain <id> --title <text> [--sources "a; b"] <draft.md>`);
  }
  const ids = cfg.domains.map((d) => d.id);
  if (!ids.includes(domain)) throw new CliError(`unknown domain "${domain}"${hint(domain, ids)}`);
  // --auto: called by a skill on its own; respects documents.autoSave.
  if (args.flags.auto === true && !cfg.documents.autoSave) {
    if (!relative(dataRoot(), draft).startsWith('..')) await rm(draft, { force: true });
    return { data: null, text: 'auto-save is off (documents.autoSave); not saved', exitCode: EXIT.nothing };
  }
  let body: string;
  try {
    body = await readFile(draft, 'utf8');
  } catch {
    throw new CliError(`cannot read draft ${draft}`);
  }
  if (!body.trim()) throw new CliError('draft is empty');
  const date = flag(args, 'date') ?? localDate(new Date(), (await loadSettings()).timeZone);
  const sources = (flag(args, 'sources') ?? '').split(';').map((s) => s.trim()).filter(Boolean);
  const path = await saveDocument(root, { title, type, domain, date, sources }, body);
  await writeIndex(root, names);
  // Drafts are scratch files; only remove them from the personal data folder.
  if (!relative(dataRoot(), draft).startsWith('..')) await rm(draft, { force: true });
  return { data: { path }, text: `saved ${shown(path)}` };
};

/** fp doc news [today|yesterday|latest|YYYY-MM-DD] */
const news: Command = async (args) => {
  const date = await resolveReportDate(args.positional[0], (await loadSettings()).timeZone);
  const path = await exportNews(date, { force: true });
  if (!path) throw new CliError(`no report for ${date}`, EXIT.nothing);
  return { data: { path }, text: `saved ${shown(path)}` };
};

/** fp doc index */
const index: Command = async () => {
  const { root, names } = await library();
  const path = await writeIndex(root, names);
  return { data: { path }, text: `wrote ${shown(path)}` };
};

/** fp doc list [--domain id] [--type lesson|research|news] [--q text] [--limit n=10] — compact, for skills. */
const list: Command = async (args) => {
  const { root } = await library();
  const domain = flag(args, 'domain');
  const type = flag(args, 'type');
  const q = flag(args, 'q')?.toLowerCase();
  const limit = Number(flag(args, 'limit') ?? 10);
  const docs = (await listDocuments(root))
    .filter((d) => (!domain || d.domain === domain) && (!type || d.type === type) && (!q || d.title.toLowerCase().includes(q)))
    .slice(0, limit);
  const text = docs.length
    ? docs.map((d) => `${d.date} · ${d.type}${d.domain ? ` · ${d.domain}` : ''} · ${d.title} · ${shown(`${root}/${d.path}`)}`).join('\n')
    : 'no documents';
  return { data: docs, text, exitCode: docs.length ? EXIT.ok : EXIT.nothing };
};

export default { save, news, index, list } satisfies Record<string, Command>;
