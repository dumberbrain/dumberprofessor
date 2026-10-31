import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { z } from 'zod';
import { canonicalUrl } from '../pipeline/canonical-url.js';
import { InterestProfile, SettingsFile, SourcesFile, type Source } from '../schemas/config.js';
import { exists } from '../store/fs.js';
import { ConfigError, configDir, formatIssues } from './load.js';

// One-time move from the pre-002 YAML files into config/professor.json (research.md R3).

export const LEGACY_FILES = ['sources.yml', 'interests.yml', 'settings.yml'] as const;

export interface MigrationResult {
  sources: number;
  merged: number;
  addedDomains: string[];
  priorityTechnologies: number;
  ignoredTopics: number;
  schedule: boolean;
}

export async function hasLegacyYaml(): Promise<boolean> {
  for (const name of LEGACY_FILES) if (await exists(join(configDir(), name))) return true;
  return false;
}

async function readLegacy<S extends z.ZodType>(name: string, schema: S): Promise<z.infer<S> | undefined> {
  const path = join(configDir(), name);
  if (!(await exists(path))) return undefined;
  const result = schema.safeParse(parse(await readFile(path, 'utf8')));
  if (!result.success) throw new ConfigError(name, formatIssues(result.error));
  return result.data;
}

type Raw = Record<string, unknown>;

function newsFields(s: Source): Raw {
  return {
    kind: s.type === 'youtube' ? 'youtube-channel' : s.type,
    name: s.name,
    ...(s.enabled ? {} : { enabled: false }),
    ...(s.channelId !== undefined ? { channelId: s.channelId } : {}),
    ...(s.params ? { params: s.params } : {}),
    purpose: s.purpose,
    updateFrequency: s.updateFrequency,
    reliability: s.reliability,
    limitations: s.limitations,
    failureBehavior: s.failureBehavior,
  };
}

/**
 * Merges the legacy YAML into `raw` (the user's professor.json as parsed JSON, or the default
 * template). A YAML source with the same id or canonical URL as an existing source is merged into
 * it (its `use` gains "news"); domains referenced by YAML but not configured are added so nothing
 * is lost. Returns the new raw config; the caller validates and writes it.
 */
export async function mergeLegacy(raw: Raw): Promise<{ raw: Raw; result: MigrationResult }> {
  const sourcesFile = await readLegacy('sources.yml', SourcesFile);
  const interests = await readLegacy('interests.yml', InterestProfile);
  const settings = await readLegacy('settings.yml', SettingsFile);

  const next: Raw = { ...raw };
  const result: MigrationResult = { sources: 0, merged: 0, addedDomains: [], priorityTechnologies: 0, ignoredTopics: 0, schedule: false };

  if (sourcesFile) {
    const domains = [...((next.domains as Raw[] | undefined) ?? [])];
    const sources = [...((next.sources as Raw[] | undefined) ?? [])];
    const canonical = (url: unknown) => (typeof url === 'string' ? canonicalUrl(url) : '');
    for (const s of sourcesFile.sources) {
      for (const d of s.domains) {
        if (!domains.some((x) => x.id === d)) {
          domains.push({ id: d, name: d, description: `${d} (added by migration from sources.yml)` });
          result.addedDomains.push(d);
        }
      }
      const index = sources.findIndex((x) => x.id === s.id || canonical(x.url) === canonicalUrl(s.url));
      if (index >= 0) {
        const existing = sources[index]!;
        const use = new Set([...((existing.use as string[] | undefined) ?? ['lessons']), 'news']);
        const existingDomains = (existing.domains as string[] | undefined) ?? [];
        sources[index] = {
          ...existing,
          ...newsFields(s),
          domains: [...new Set([...existingDomains, ...s.domains])],
          use: [...use],
        };
        result.merged++;
      } else {
        const { kind, name, ...rest } = newsFields(s);
        sources.push({ id: s.id, kind, name, url: s.url, tier: s.tier, domains: s.domains, use: ['news'], ...rest });
      }
      result.sources++;
    }
    next.domains = domains;
    next.sources = sources;
  }

  if (interests) {
    next.ranking = { priorityTechnologies: interests.priorityTechnologies, ignoredTopics: interests.ignoredTopics };
    result.priorityTechnologies = interests.priorityTechnologies.length;
    result.ignoredTopics = interests.ignoredTopics.length;
  }

  if (settings) {
    next.schedule = { ...settings.schedule };
    result.schedule = true;
  }

  return { raw: next, result };
}

/** Moves the YAML files to config/legacy/ so they are never read again. */
export async function retireLegacy(): Promise<void> {
  const legacyDir = join(configDir(), 'legacy');
  await mkdir(legacyDir, { recursive: true });
  for (const name of LEGACY_FILES) {
    const from = join(configDir(), name);
    if (await exists(from)) await rename(from, join(legacyDir, name));
  }
  await writeFile(
    join(legacyDir, 'README.md'),
    'Pre-002 configuration, migrated into ../professor.json. These files are no longer read.\n',
    'utf8',
  );
}

export function describeMigration(r: MigrationResult): string {
  const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
  const parts = [
    `${plural(r.sources, 'source')}${r.merged ? ` (${r.merged} merged)` : ''}`,
    `${plural(r.priorityTechnologies, 'priority technology', 'priority technologies')}, ${plural(r.ignoredTopics, 'ignored topic')}`,
  ];
  if (r.schedule) parts[1] += ', schedule';
  if (r.addedDomains.length) parts.push(`added domains: ${r.addedDomains.join(', ')}`);
  return `migrated: ${parts.join('; ')} → config/professor.json; YAML moved to config/legacy/`;
}
