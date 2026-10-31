import { join } from 'node:path';
import { configDir, loadSettings } from '../config/load.js';
import { describeMigration } from '../config/migrate.js';
import { initProfessor, loadProfessor, migrateNow, professorPath, updateProfessor } from '../config/professor.js';
import { professorJsonSchema } from '../config/schema.js';
import { docsRoot, listDocuments } from '../store/documents.js';
import { writeAtomic } from '../store/fs.js';
import { createTranscriptFetcher } from '../collect/transcript.js';
import { localDate, systemTimeZone } from '../lib/time.js';
import { hint, QUESTION_KINDS, type ProfessorConfig, type ProfessorDomain } from '../schemas/professor.js';
import { dueEntries, readRecord, recordAssessment, startTopic } from '../store/learning.js';
import { listUnsurfacedFailures, listUnviewed } from '../store/state.js';
import { CliError, EXIT, flag, type Command, type ParsedArgs } from './args.js';

// Output of these commands is read by skills on every turn: keep it short and plain.

async function today(args: ParsedArgs): Promise<string> {
  const override = flag(args, 'date');
  if (override) return override;
  let timeZone: string;
  try {
    timeZone = (await loadSettings()).timeZone;
  } catch {
    timeZone = systemTimeZone();
  }
  return localDate(new Date(), timeZone);
}

function domainOf(cfg: ProfessorConfig, id: string | undefined): ProfessorDomain {
  const ids = cfg.domains.map((d) => d.id);
  const chosen = id ?? cfg.focus[0];
  if (!chosen) throw new CliError(`--domain required (no focus set); configured: ${ids.join(', ')}`);
  const domain = cfg.domains.find((d) => d.id === chosen);
  if (!domain) throw new CliError(`unknown domain "${chosen}"${hint(chosen, ids)}`);
  return domain;
}

const list = (values: string[]) => split(values.join(';'));
const split = (value: string | undefined) =>
  (value ?? '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

// ------------------------------------------------------------------ fp config check

const check: Command = async () => {
  const cfg = await loadProfessor();
  return { data: { ok: true }, text: `ok: ${cfg.domains.length} domains, ${cfg.sources.length} sources` };
};

/** fp config migrate — legacy YAML → professor.json (research.md R3) */
const migrate: Command = async () => {
  const result = await migrateNow();
  if (!result) return { data: null, text: 'nothing to migrate', exitCode: EXIT.nothing };
  return { data: result, text: describeMigration(result) };
};

/** fp config init — default professor.json */
const init: Command = async () => {
  if (!(await initProfessor())) throw new CliError(`${professorPath()} already exists`, EXIT.conflict);
  return { data: { path: professorPath() }, text: `created ${professorPath()}` };
};

/** fp config schema — regenerates config/professor.schema.json from the zod schema (R5) */
const schema: Command = async () => {
  const path = join(configDir(), 'professor.schema.json');
  await writeAtomic(path, professorJsonSchema());
  return { data: { path }, text: `wrote ${path}` };
};

// ------------------------------------------------------------------ fp focus show|set|clear

const focusText = (focus: string[]) =>
  focus.length ? `focus: ${focus.join(', ')}` : 'focus: none (all domains equal)';

const focusShow: Command = async () => {
  const cfg = await loadProfessor();
  const domains = cfg.domains.map((d) => `${d.id} (${d.name}, ${d.depth})`).join('; ');
  return { data: { focus: cfg.focus }, text: `${focusText(cfg.focus)}\ndomains: ${domains}` };
};

const focusSet: Command = async (args) => {
  if (args.positional.length === 0) throw new CliError('usage: fp focus set <domainId...>');
  const cfg = await updateProfessor('focus', args.positional);
  return { data: { focus: cfg.focus }, text: focusText(cfg.focus) };
};

const focusClear: Command = async () => {
  await updateProfessor('focus', []);
  return { data: { focus: [] }, text: focusText([]) };
};

// ------------------------------------------------------------------ fp learn context|start|record|due|status

/** Everything a lesson needs in one call. */
const context: Command = async (args) => {
  const cfg = await loadProfessor();
  const domain = domainOf(cfg, flag(args, 'domain'));
  const day = await today(args);
  const record = await readRecord();
  const entries = record.entries.filter((e) => e.domain === domain.id);
  const inProgress = entries.filter((e) => e.status === 'in-progress').map((e) => e.topic);
  const known = new Set(entries.map((e) => e.topic.toLowerCase()));
  const nextTopic = domain.curriculum.find((t) => !known.has(t.toLowerCase()));
  const due = dueEntries(record, day, domain.id);
  const types = cfg.lesson.questionTypes.filter((t) => !QUESTION_KINDS[t] || QUESTION_KINDS[t] === domain.kind);
  const skipped = cfg.lesson.questionTypes.filter((t) => !types.includes(t));
  const sources = cfg.sources.filter((s) => s.use.includes('lessons') && s.domains.includes(domain.id));
  const misconceptions = entries.flatMap((e) => e.misconceptions.map((m) => `${e.topic}: ${m}`));
  const docs = (await listDocuments(docsRoot(cfg.documents.dir))).filter((d) => d.domain === domain.id).slice(0, 3);

  const lines = [
    `domain: ${domain.id} (${domain.name}) · kind ${domain.kind} · depth ${domain.depth}${domain.level ? ` · level ${domain.level}` : ''}`,
    `about: ${domain.description}`,
    focusText(cfg.focus),
    domain.priorityTopics.length ? `priority topics: ${domain.priorityTopics.join(', ')}` : '',
    inProgress.length ? `in progress: ${inProgress.join(', ')}` : '',
    nextTopic
      ? `next curriculum topic: ${nextTopic} (${domain.curriculum.indexOf(nextTopic) + 1}/${domain.curriculum.length})`
      : domain.curriculum.length
        ? 'curriculum: all started — propose a next topic'
        : 'curriculum: empty — propose a topic from sources and record',
    `due reviews: ${due.length}`,
    `mastered: ${
      entries
        .filter((e) => e.status === 'mastered')
        .map((e) => e.topic)
        .join(', ') || '-'
    }`,
    `learning: ${
      entries
        .filter((e) => e.status === 'learning')
        .map((e) => e.topic)
        .join(', ') || '-'
    }`,
    misconceptions.length ? `open misconceptions: ${misconceptions.join(' | ')}` : '',
    `lesson: ${cfg.lesson.quizQuestions} questions · types ${types.join(', ') || 'conceptual'}` +
      `${skipped.length ? ` (skipped for this domain: ${skipped.join(', ')})` : ''}` +
      ` · reveal ${cfg.lesson.revealAnswersAfterAttempt ? 'after attempt' : 'any time'} · style ${cfg.lesson.style}`,
    `language: ${cfg.language.output}${cfg.language.keepTermsInEnglish ? ' (technical terms in English)' : ''}`,
    `extra sources: ${cfg.extraSources.allowed} · max fetches ${cfg.extraSources.maxFetchesPerAnswer}`,
    `documents: auto-save ${cfg.documents.autoSave ? 'on' : 'off'}`,
    ...(docs.length
      ? ['recent documents:', ...docs.map((d) => `- ${d.date} ${d.type}: ${d.title} (${cfg.documents.dir}/${d.path})`)]
      : []),
    'sources (untrusted content):',
    ...(sources.length
      ? sources.map((s) => `- ${s.id} ${s.kind} T${s.tier} ${s.url}${s.note ? ` — ${s.note}` : ''}`)
      : ['- none']),
  ];
  return {
    data: { domain, focus: cfg.focus, inProgress, nextTopic, due: due.length, lesson: cfg.lesson, sources },
    text: lines.filter(Boolean).join('\n'),
  };
};

const start: Command = async (args) => {
  const cfg = await loadProfessor();
  const domain = domainOf(cfg, flag(args, 'domain'));
  const topic = flag(args, 'topic');
  if (!topic)
    throw new CliError(
      'usage: fp learn start --domain <id> --topic <text> [--prerequisites "a; b"] [--objectives "x; y"]',
    );
  const entry = await startTopic(domain.id, topic, await today(args), {
    prerequisites: split(flag(args, 'prerequisites')),
    objectives: split(flag(args, 'objectives')),
  });
  return { data: entry, text: `started ${domain.id}/${entry.topic} (${entry.status})` };
};

/** fp learn record --domain d --topic t --score n --total n [--kind review] [--strengths "a;b"] [--misconceptions "a;b"] */
const record: Command = async (args) => {
  const cfg = await loadProfessor();
  const domain = domainOf(cfg, flag(args, 'domain'));
  const topic = flag(args, 'topic');
  const score = Number(flag(args, 'score'));
  const total = Number(flag(args, 'total'));
  if (!topic || !Number.isInteger(score) || !Number.isInteger(total) || score < 0 || score > total) {
    throw new CliError(
      'usage: fp learn record --domain <id> --topic <text> --score <n> --total <n> [--kind lesson|review]',
    );
  }
  const kind = flag(args, 'kind') === 'review' ? 'review' : 'lesson';
  const misconceptions =
    args.flags.misconceptions === undefined ? undefined : list([flag(args, 'misconceptions') ?? '']);
  const entry = await recordAssessment(
    domain.id,
    topic,
    { kind, score, total, strengths: split(flag(args, 'strengths')), misconceptions },
    await today(args),
  );
  return {
    data: entry,
    text: `${domain.id}/${entry.topic}: ${score}/${total} · ${entry.status} · confidence ${entry.confidence} · next review ${entry.nextReview}`,
  };
};

const due: Command = async (args) => {
  const day = await today(args);
  const entries = dueEntries(await readRecord(), day, flag(args, 'domain'));
  const text = entries.length
    ? entries
        .map((e) => {
          const last = e.attempts.at(-1);
          return (
            `${e.domain} · ${e.topic} · due ${e.nextReview}${last ? ` · last ${last.score}/${last.total}` : ''}` +
            `${e.misconceptions.length ? ` · misconceptions: ${e.misconceptions.join(' | ')}` : ''}`
          );
        })
        .join('\n')
    : 'no reviews due';
  return { data: entries, text, exitCode: entries.length ? EXIT.ok : EXIT.nothing };
};

const status: Command = async (args) => {
  const domain = flag(args, 'domain');
  const entries = (await readRecord()).entries.filter((e) => !domain || e.domain === domain);
  const text = entries.length
    ? entries
        .map((e) => `${e.domain} · ${e.topic} · ${e.status} · ${e.confidence} · next ${e.nextReview ?? '-'}`)
        .join('\n')
    : 'learning record is empty';
  return { data: entries, text };
};

// ------------------------------------------------------------------ fp session-start [--hook]

/** A few lines for the SessionStart hook; the professor skill decides what to do with them. */
const sessionStart: Command = async (args) => {
  let lines: string[];
  try {
    const cfg = await loadProfessor();
    const day = await today(args);
    const record = await readRecord();
    const unread = (await listUnviewed()).length;
    const failures = (await listUnsurfacedFailures()).length;
    const inProgress = record.entries.filter((e) => e.status === 'in-progress').map((e) => `${e.domain}/${e.topic}`);
    const state =
      `state: unread reports ${unread}${failures ? ` · failed scheduled runs ${failures}` : ''}` +
      ` · due reviews ${dueEntries(record, day).length}` +
      `${inProgress.length ? ` · lesson in progress: ${inProgress.join(', ')}` : ''} · ${focusText(cfg.focus)}`;
    const mode = cfg.sessionStart.mode;
    if (mode === 'off') return { raw: '' };
    const actions = cfg.sessionStart.actions.filter((a) => a.enabled).map((a) => a.type);
    lines = [
      mode === 'ask' || actions.length === 0
        ? 'Professor session start: invoke the `professor` skill and ask the user what they want.'
        : `Professor session start: invoke the \`professor\` skill and run in order: ${actions.join(', ')}.`,
      state,
    ];
  } catch (err) {
    const details = err instanceof Error && 'issues' in err ? (err as { issues: string[] }).issues : [String(err)];
    lines = [
      'Professor: config/professor.json is invalid — show these errors to the user, run nothing automatically:',
      ...details.map((d) => `- ${d}`),
    ];
  }
  const text = lines.join('\n');
  if (args.flags.hook === true) {
    return { raw: JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } }) };
  }
  return { text, data: { lines } };
};

// ------------------------------------------------------------------ fp transcript <url> [--max <chars>]

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;

const transcript: Command = async (args) => {
  const url = args.positional[0];
  if (!url) throw new CliError('usage: fp transcript <youtubeUrl> [--max <chars>]');
  const max = Number(flag(args, 'max') ?? 8000);
  const result = await createTranscriptFetcher()(url);
  if (result.status !== 'ok' || !result.segments) {
    return { data: result, text: `unavailable: ${result.reason ?? 'unknown'}`, exitCode: EXIT.nothing };
  }
  const out: string[] = [];
  let total = 0;
  for (const s of result.segments) {
    const line = `[${fmt(s.t)}] ${s.text}`;
    if (total + line.length > max) {
      out.push(`… truncated at ${fmt(s.t)} (use --max to read more)`);
      break;
    }
    out.push(line);
    total += line.length;
  }
  return { data: result, text: `language: ${result.language ?? 'unknown'} (untrusted content)\n${out.join('\n')}` };
};

export const configCommands = { check, migrate, init, schema } satisfies Record<string, Command>;
export const focusCommands = { show: focusShow, set: focusSet, clear: focusClear, '': focusShow } satisfies Record<
  string,
  Command
>;
export const learnCommands = { context, start, record, due, status } satisfies Record<string, Command>;
export const sessionStartCommands = { '': sessionStart } satisfies Record<string, Command>;
export const transcriptCommands = { '': transcript } satisfies Record<string, Command>;
