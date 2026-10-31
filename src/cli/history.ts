import { loadSettings } from '../config/load.js';
import { toIsoInZone } from '../lib/time.js';
import { loadProfessor } from '../config/professor.js';
import { Category } from '../schemas/enums.js';
import { hint } from '../schemas/professor.js';
import { rateReport } from '../store/feedback.js';
import { readIndex } from '../store/reports.js';
import { searchItems } from '../store/search.js';
import { CliError, flag, type Command } from './args.js';
import { resolveReportDate } from './report.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** FR-035: a removed domain stays searchable as long as stored items carry it. */
async function checkDomain(domain: string): Promise<void> {
  const configured = (await loadProfessor()).domains.map((d) => d.id);
  const stored = (await readIndex()).flatMap((i) => i.domains);
  const known = [...new Set([...configured, ...stored])];
  if (!known.includes(domain)) throw new CliError(`unknown domain "${domain}"${hint(domain, known)}`);
}

/** fp search [--q] [--from] [--to] [--category] [--domain] */
const search: Command = async (args) => {
  const from = flag(args, 'from');
  const to = flag(args, 'to');
  for (const [name, v] of [['from', from], ['to', to]] as const) {
    if (v && !DATE.test(v)) throw new CliError(`--${name}: expected YYYY-MM-DD`);
  }
  const category = flag(args, 'category');
  const domain = flag(args, 'domain');
  if (domain) await checkDomain(domain);
  const q = flag(args, 'q') ?? (args.positional.join(' ') || undefined);
  const items = await searchItems({
    q,
    from,
    to,
    category: category ? Category.parse(category) : undefined,
    domain,
  });
  const text = items.length
    ? items
        .map((i) => `${i.reportDate}  #${i.rank}  [${i.category}]  ${i.title}\n            ${i.primarySource.url}`)
        .join('\n')
    : 'no matching items';
  return { data: items, text };
};

/** fp rate <date|today|yesterday> <1-5> [--comment <text>] */
const rate: Command = async (args) => {
  const [dateSpec, ratingText] = args.positional;
  const rating = Number(ratingText);
  if (!dateSpec || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new CliError('usage: fp rate <date> <1-5> [--comment <text>]');
  }
  const { timeZone } = await loadSettings();
  const date = await resolveReportDate(dateSpec, timeZone);
  try {
    const entry = await rateReport(date, rating, flag(args, 'comment'), toIsoInZone(new Date(), timeZone));
    return { data: entry, text: `rated ${date}: ${rating}/5` };
  } catch (err) {
    throw new CliError(err instanceof Error ? err.message : String(err));
  }
};

export const searchCommands = { '': search } satisfies Record<string, Command>;
export const rateCommands = { '': rate } satisfies Record<string, Command>;
