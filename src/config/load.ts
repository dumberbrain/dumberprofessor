import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import {
  InterestProfile,
  ScheduleSettings,
  SettingsFile,
  SourcesFile,
  type Source,
} from '../schemas/config.js';
import { systemTimeZone } from '../lib/time.js';

export class ConfigError extends Error {
  constructor(
    readonly file: string,
    readonly issues: string[],
  ) {
    super(`invalid ${file}:\n  ${issues.join('\n  ')}`);
    this.name = 'ConfigError';
  }
}

export function configDir(): string {
  return resolve(process.env.FP_CONFIG_DIR ?? 'config');
}

export function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((i) => `${i.path.length ? i.path.join('.') : '(root)'}: ${i.message}`);
}

async function loadYaml<S extends z.ZodType>(name: string, schema: S): Promise<z.infer<S>> {
  const path = join(configDir(), name);
  let raw: unknown;
  try {
    raw = parse(await readFile(path, 'utf8'));
  } catch (err) {
    throw new ConfigError(name, [err instanceof Error ? err.message : String(err)]);
  }
  const result = schema.safeParse(raw);
  if (!result.success) throw new ConfigError(name, formatIssues(result.error));
  return result.data;
}

export async function loadSources(): Promise<Source[]> {
  return (await loadYaml('sources.yml', SourcesFile)).sources;
}

export async function loadInterests(): Promise<InterestProfile> {
  return loadYaml('interests.yml', InterestProfile);
}

export interface ResolvedSettings extends ScheduleSettings {
  timeZone: string;
}

export async function loadSettings(): Promise<ResolvedSettings> {
  const file = await loadYaml('settings.yml', SettingsFile);
  return { ...file.schedule, timeZone: file.schedule.timeZone ?? systemTimeZone() };
}

export function sourcesPath(): string {
  return join(configDir(), 'sources.yml');
}

export function settingsPath(): string {
  return join(configDir(), 'settings.yml');
}
