import { pathToFileURL } from 'node:url';
import { ZodError } from 'zod';
import { CliError, EXIT, parseArgs, type Command, type CommandResult } from './args.js';
import { ConfigError, formatIssues } from '../config/load.js';
import { ImmutableExistsError } from '../store/fs.js';
import { redact } from '../lib/http.js';

type Loader = () => Promise<Record<string, Command>>;

/** command name → module exporting handlers keyed by sub-command ('' for none) */
const COMMANDS: Record<string, Loader> = {
  collect: async () => (await import('./collect.js')).default,
  sources: async () => (await import('./sources.js')).default,
  'save-report': async () => (await import('./report.js')).saveReportCommands,
  show: async () => (await import('./report.js')).showCommands,
  unread: async () => (await import('./unread.js')).unreadCommands,
  'record-failure': async () => (await import('./unread.js')).recordFailureCommands,
  schedule: async () => (await import('./schedule.js')).default,
  search: async () => (await import('./history.js')).searchCommands,
  rate: async () => (await import('./history.js')).rateCommands,
  followup: async () => (await import('./followup.js')).default,
};

export async function run(argv: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const [name, ...rest] = argv;
  const loader = name ? COMMANDS[name] : undefined;
  if (!loader) {
    return { exitCode: EXIT.invalid, stdout: '', stderr: `${name ? `unknown command "${name}"\n` : ''}${usage()}` };
  }
  const handlers = await loader();
  const sub = rest[0] && handlers[rest[0]] ? rest[0] : '';
  const handler = handlers[sub];
  if (!handler) {
    return { exitCode: EXIT.invalid, stdout: '', stderr: `"${name}" requires one of: ${Object.keys(handlers).join(', ')}` };
  }
  const args = parseArgs(sub ? rest.slice(1) : rest);
  const asJson = args.flags.json === true;
  try {
    const result: CommandResult = await handler(args);
    const stdout = result.raw ?? (asJson ? JSON.stringify(result.data ?? null, null, 2) : (result.text ?? ''));
    return { exitCode: result.exitCode ?? EXIT.ok, stdout, stderr: '' };
  } catch (err) {
    return errorResult(err, asJson);
  }
}

function errorResult(err: unknown, asJson: boolean): { exitCode: number; stdout: string; stderr: string } {
  let exitCode: number = EXIT.invalid;
  let message: string;
  let details: unknown;
  if (err instanceof CliError) {
    exitCode = err.exitCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof ImmutableExistsError) {
    exitCode = EXIT.conflict;
    message = err.message;
  } else if (err instanceof ConfigError) {
    message = err.message;
    details = err.issues;
  } else if (err instanceof ZodError) {
    message = 'validation failed';
    details = formatIssues(err);
  } else {
    message = err instanceof Error ? err.message : String(err);
  }
  message = redact(message);
  const stderr = asJson
    ? JSON.stringify({ error: message, details }, null, 2)
    : [message, ...(Array.isArray(details) ? details.map((d) => `  - ${String(d)}`) : [])].join('\n');
  return { exitCode, stdout: '', stderr };
}

function usage(): string {
  return `usage: fp <command> [options] [--json]\ncommands: ${Object.keys(COMMANDS).sort().join(', ')}`;
}

async function main(): Promise<void> {
  const { exitCode, stdout, stderr } = await run(process.argv.slice(2));
  if (stdout) process.stdout.write(stdout.endsWith('\n') ? stdout : `${stdout}\n`);
  if (stderr) process.stderr.write(stderr.endsWith('\n') ? stderr : `${stderr}\n`);
  process.exitCode = exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
