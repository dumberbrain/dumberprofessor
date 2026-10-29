/** Exit codes from contracts/cli.md */
export const EXIT = { ok: 0, invalid: 1, nothing: 2, conflict: 3 } as const;
export type ExitCode = (typeof EXIT)[keyof typeof EXIT];

export class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode: ExitCode = EXIT.invalid,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'CliError';
  }
}

const BOOLEAN_FLAGS = new Set(['json', 'append', 'hook']);

export interface ParsedArgs {
  positional: string[];
  flags: Record<string, string | true>;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith('--')) {
      const [key, inline] = arg.slice(2).split('=', 2) as [string, string | undefined];
      if (inline !== undefined) flags[key] = inline;
      else if (BOOLEAN_FLAGS.has(key) || argv[i + 1] === undefined || argv[i + 1]!.startsWith('--')) flags[key] = true;
      else flags[key] = argv[++i]!;
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

export function flag(args: ParsedArgs, name: string): string | undefined {
  const v = args.flags[name];
  return typeof v === 'string' ? v : undefined;
}

export interface CommandResult {
  /** Machine-readable payload printed with --json */
  data?: unknown;
  /** Human-readable text printed otherwise */
  text?: string;
  /** Printed verbatim regardless of --json (e.g., hook JSON) */
  raw?: string;
  exitCode?: ExitCode;
}

export type Command = (args: ParsedArgs) => Promise<CommandResult>;
