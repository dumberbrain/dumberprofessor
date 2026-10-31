import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { z } from 'zod';
import type { InterestProfile, ScheduleSettings, Source } from '../schemas/config.js';
import { localDate, systemTimeZone } from '../lib/time.js';
import { loadProfessor, professorPath, toCollectorSource } from './professor.js';

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

/** News sources (`use` contains "news") in the collector's shape. */
export async function loadSources(): Promise<Source[]> {
  return (await loadProfessor()).sources.filter((s) => s.use.includes('news')).map(toCollectorSource);
}

/** Ranking preferences (FR-013a); never changed by the system. */
export async function loadInterests(): Promise<InterestProfile> {
  const { ranking, schedule } = await loadProfessor();
  const updatedAt = localDate((await stat(professorPath())).mtime, schedule.timeZone ?? systemTimeZone());
  return { ...ranking, updatedAt };
}

export interface ResolvedSettings extends ScheduleSettings {
  timeZone: string;
}

export async function loadSettings(): Promise<ResolvedSettings> {
  const { schedule } = await loadProfessor();
  return { ...schedule, timeZone: schedule.timeZone ?? systemTimeZone() };
}
