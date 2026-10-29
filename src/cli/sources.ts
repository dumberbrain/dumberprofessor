import { readFile } from 'node:fs/promises';
import { parseDocument, isMap, isSeq } from 'yaml';
import { githubAdvisoriesAdapter } from '../collect/adapters/github-advisories.js';
import { hnAdapter } from '../collect/adapters/hn.js';
import { rssAdapter } from '../collect/adapters/rss.js';
import type { Adapter, AdapterContext } from '../collect/adapters/types.js';
import { resolveChannelId, youtubeAdapter } from '../collect/adapters/youtube.js';
import { loadSources, sourcesPath } from '../config/load.js';
import { httpGet, redact } from '../lib/http.js';
import { writeAtomic } from '../store/fs.js';
import type { Source } from '../schemas/config.js';
import { EXIT, type Command } from './args.js';

const ADAPTERS: Partial<Record<Source['type'], Adapter>> = {
  rss: rssAdapter,
  youtube: youtubeAdapter,
  hn: hnAdapter,
  'github-advisories': githubAdvisoriesAdapter,
};

interface ProbeResult {
  id: string;
  type: Source['type'];
  enabled: boolean;
  status: 'ok' | 'unavailable' | 'skipped';
  items?: number;
  newest?: string | null;
  error?: string;
}

async function probe(source: Source): Promise<ProbeResult> {
  const base = { id: source.id, type: source.type, enabled: source.enabled };
  if (!source.enabled) return { ...base, status: 'skipped' };
  const now = new Date();
  const ctx: AdapterContext = {
    window: { start: new Date(now.getTime() - 30 * 86_400_000).toISOString(), end: now.toISOString(), catchUp: true },
    discoveredAt: now.toISOString(),
    transcripts: async () => ({ status: 'unavailable', reason: 'probe' }),
  };
  try {
    const adapter = ADAPTERS[source.type];
    if (!adapter) {
      await httpGet(source.url);
      return { ...base, status: 'ok' };
    }
    const items = await adapter(source, ctx);
    const newest = items.map((i) => i.publishedAt).filter((d): d is string => d !== null).sort().at(-1) ?? null;
    return { ...base, status: 'ok', items: items.length, newest };
  } catch (err) {
    return { ...base, status: 'unavailable', error: redact(err instanceof Error ? err.message : String(err)) };
  }
}

/** Validates config/sources.yml and probes every enabled source once. */
const check: Command = async () => {
  const sources = await loadSources();
  const results: ProbeResult[] = [];
  for (let i = 0; i < sources.length; i += 8) {
    results.push(...(await Promise.all(sources.slice(i, i + 8).map(probe))));
  }
  const failed = results.filter((r) => r.status === 'unavailable');
  const text = results
    .map((r) => {
      if (r.status === 'skipped') return `-  ${r.id} (disabled)`;
      if (r.status === 'unavailable') return `✗  ${r.id}: ${r.error}`;
      return `✓  ${r.id}${r.items !== undefined ? ` — ${r.items} items, newest ${r.newest?.slice(0, 10) ?? 'undated'}` : ''}`;
    })
    .concat(`\n${results.length - failed.length}/${results.length} ok`)
    .join('\n');
  return { data: results, text, exitCode: failed.length ? EXIT.invalid : EXIT.ok };
};

/** Fills channelId for YouTube handles, preserving comments and layout of sources.yml. */
const resolve: Command = async () => {
  const path = sourcesPath();
  const doc = parseDocument(await readFile(path, 'utf8'));
  const list = doc.get('sources');
  if (!isSeq(list)) throw new Error('sources.yml: "sources" must be a list');

  const results: { id: string; channelId?: string; error?: string; status: 'resolved' | 'kept' | 'failed' }[] = [];
  for (const node of list.items) {
    if (!isMap(node) || node.get('type') !== 'youtube') continue;
    const id = String(node.get('id'));
    const existing = node.get('channelId');
    if (typeof existing === 'string' && existing) {
      results.push({ id, channelId: existing, status: 'kept' });
      continue;
    }
    try {
      const channelId = await resolveChannelId(String(node.get('url')));
      node.set('channelId', channelId);
      results.push({ id, channelId, status: 'resolved' });
    } catch (err) {
      results.push({ id, error: redact(err instanceof Error ? err.message : String(err)), status: 'failed' });
    }
  }
  if (results.some((r) => r.status === 'resolved')) await writeAtomic(path, doc.toString({ lineWidth: 0 }));
  const failed = results.filter((r) => r.status === 'failed');
  const text = results
    .map((r) => (r.status === 'failed' ? `✗  ${r.id}: ${r.error}` : `✓  ${r.id}: ${r.channelId}${r.status === 'kept' ? ' (already set)' : ''}`))
    .join('\n');
  return { data: results, text, exitCode: failed.length ? EXIT.invalid : EXIT.ok };
};

export default { check, resolve } satisfies Record<string, Command>;
