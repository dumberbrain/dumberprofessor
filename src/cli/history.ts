import { loadSettings } from '../config/load.js';
import { toIsoInZone } from '../lib/time.js';
import { Category, Domain } from '../schemas/enums.js';
import { rateReport } from '../store/feedback.js';
import { searchItems } from '../store/search.js';
import { CliError, flag, type Command } from './args.js';
import { resolveReportDate } from './report.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** fp search [--q] [--from] [--to] [--category] [--domain] */
const search: Command = async (args) => {
  const from = flag(args, 'from');
  const to = flag(args, 'to');
  for (const [name, v] of [['from', from], ['to', to]] as const) {
    if (v && !DATE.test(v)) throw new CliError(`--${name}: expected YYYY-MM-DD`);
  }
  const category = flag(args, 'category');
  const domain = flag(args, 'domain');
  const q = flag(args, 'q') ?? (args.positional.join(' ') || undefined);
  const items = await searchItems({
    q,
    from,
    to,
    category: category ? Category.parse(category) : undefined,
    domain: domain ? Domain.parse(domain) : undefined,
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
