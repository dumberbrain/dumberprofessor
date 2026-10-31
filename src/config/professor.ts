import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseDocument } from 'yaml';
import type { Source } from '../schemas/config.js';
import { ProfessorConfig, type ProfessorSource } from '../schemas/professor.js';
import { exists, writeAtomic } from '../store/fs.js';
import { ConfigError, configDir, formatIssues } from './load.js';
import { describeMigration, hasLegacyYaml, mergeLegacy, retireLegacy, type MigrationResult } from './migrate.js';

export const PROFESSOR_FILE = 'professor.json';

type Raw = Record<string, unknown>;

export function professorPath(): string {
  return join(configDir(), PROFESSOR_FILE);
}

export async function defaultProfessor(): Promise<Raw> {
  return JSON.parse(await readFile(new URL('./default-professor.json', import.meta.url), 'utf8'));
}

/**
 * JSON.parse message with line and column. Node reports a character position for some errors and
 * none for others; then the YAML parser (a JSON superset) usually locates the problem.
 */
function syntaxIssue(text: string, err: unknown): string {
  const message = (err instanceof Error ? err.message : String(err)).replace(/\s+/g, ' ');
  if (/line \d+/.test(message)) return message;
  const pos = /position (\d+)/.exec(message)?.[1];
  if (pos !== undefined) {
    const before = text.slice(0, Number(pos)).split(/\r?\n/);
    return `${message} (line ${before.length}, column ${before.at(-1)!.length + 1})`;
  }
  const at = parseDocument(text).errors.find((e) => e.linePos)?.linePos?.[0];
  return at ? `${message} (near line ${at.line}, column ${at.col})` : message;
}

async function readFileRaw(): Promise<Raw> {
  const text = await readFile(professorPath(), 'utf8');
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new ConfigError(PROFESSOR_FILE, [syntaxIssue(text, err)]);
  }
}

function validate(raw: Raw): ProfessorConfig {
  const result = ProfessorConfig.safeParse(raw);
  if (!result.success) throw new ConfigError(PROFESSOR_FILE, formatIssues(result.error));
  return result.data;
}

async function writeRaw(raw: Raw): Promise<void> {
  await writeAtomic(professorPath(), `${JSON.stringify(raw, null, 2)}\n`);
}

/** Merges legacy YAML into professor.json (or the defaults) and retires the YAML. null → nothing to do. */
export async function migrateNow(): Promise<MigrationResult | null> {
  if (!(await hasLegacyYaml())) return null;
  const base = (await exists(professorPath())) ? await readFileRaw() : await defaultProfessor();
  const { raw, result } = await mergeLegacy(base);
  validate(raw);
  await writeRaw(raw);
  await retireLegacy();
  return result;
}

/** Writes the default file; false when one already exists. */
export async function initProfessor(): Promise<boolean> {
  if (await exists(professorPath())) return false;
  await writeRaw(await defaultProfessor());
  return true;
}

/** FR-005/FR-006: migrate legacy YAML or create the default file before anything reads config. */
async function ensureProfessor(): Promise<void> {
  const migrated = await migrateNow();
  if (migrated) {
    process.stderr.write(`${describeMigration(migrated)}\n`);
    return;
  }
  if (await initProfessor()) process.stderr.write(`created ${professorPath()} with default settings\n`);
}

async function readRaw(): Promise<Raw> {
  await ensureProfessor();
  return readFileRaw();
}

export async function loadProfessor(): Promise<ProfessorConfig> {
  return validate(await readRaw());
}

/** A `news` source in the shape the feature-001 collector and adapters expect. */
export function toCollectorSource(s: ProfessorSource): Source {
  return {
    id: s.id,
    name: s.name ?? s.id,
    type: s.kind === 'youtube-channel' ? 'youtube' : (s.kind as Source['type']),
    url: s.url,
    ...(s.channelId !== undefined ? { channelId: s.channelId } : {}),
    tier: s.tier,
    domains: s.domains,
    purpose: s.purpose,
    updateFrequency: s.updateFrequency,
    reliability: s.reliability,
    limitations: s.limitations,
    failureBehavior: s.failureBehavior,
    enabled: s.enabled,
    ...(s.params ? { params: s.params } : {}),
  };
}

/**
 * Changes one top-level field and writes the file back. Every other field the user wrote is kept
 * as written (defaults are not materialized). The result is validated before writing.
 */
export async function updateProfessor(key: string, value: unknown): Promise<ProfessorConfig> {
  const raw = { ...(await readRaw()), [key]: value };
  const cfg = validate(raw);
  await writeRaw(raw);
  return cfg;
}

/** Raw (as written) value of one top-level field, for read-modify-write of nested data. */
export async function rawProfessorField(key: string): Promise<unknown> {
  return (await readRaw())[key];
}
