import { githubAdvisoriesAdapter } from '../collect/adapters/github-advisories.js';
import { hnAdapter } from '../collect/adapters/hn.js';
import { rssAdapter } from '../collect/adapters/rss.js';
import type { Adapter, AdapterContext } from '../collect/adapters/types.js';
import { resolveChannelId, youtubeAdapter } from '../collect/adapters/youtube.js';
import { loadSources } from '../config/load.js';
import { rawProfessorField, updateProfessor } from '../config/professor.js';
import { httpGet, redact } from '../lib/http.js';
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

const INTEGRATION_FIELDS = ['purpose', 'updateFrequency', 'reliability', 'limitations', 'failureBehavior'] as const;

/** Validates the news sources in config/professor.json and probes every enabled one once. */
const check: Command = async () => {
  const sources = await loadSources();
  const results: ProbeResult[] = [];
  for (let i = 0; i < sources.length; i += 8) {
    results.push(...(await Promise.all(sources.slice(i, i + 8).map(probe))));
  }
  // Constitution Extensibility: every integration declares these; migration fills them, hand-added sources may not.
  const warnings = sources
    .map((s) => ({ id: s.id, missing: INTEGRATION_FIELDS.filter((f) => s[f] === 'unspecified') }))
    .filter((w) => w.missing.length > 0)
    .map((w) => `!  ${w.id}: unspecified ${w.missing.join(', ')}`);
  const failed = results.filter((r) => r.status === 'unavailable');
  const text = results
    .map((r) => {
      if (r.status === 'skipped') return `-  ${r.id} (disabled)`;
      if (r.status === 'unavailable') return `✗  ${r.id}: ${r.error}`;
      return `✓  ${r.id}${r.items !== undefined ? ` — ${r.items} items, newest ${r.newest?.slice(0, 10) ?? 'undated'}` : ''}`;
    })
    .concat(warnings)
    .concat(`\n${results.length - failed.length}/${results.length} ok`)
    .join('\n');
  return { data: { results, warnings }, text, exitCode: failed.length ? EXIT.invalid : EXIT.ok };
};

/** Fills channelId for YouTube channel handles in config/professor.json. */
const resolve: Command = async () => {
  const list = [...(((await rawProfessorField('sources')) ?? []) as Record<string, unknown>[])];

  const results: { id: string; channelId?: string; error?: string; status: 'resolved' | 'kept' | 'failed' }[] = [];
  for (const [i, node] of list.entries()) {
    if (node.kind !== 'youtube-channel') continue;
    const id = String(node.id);
    const existing = node.channelId;
    if (typeof existing === 'string' && existing) {
      results.push({ id, channelId: existing, status: 'kept' });
      continue;
    }
    try {
      const channelId = await resolveChannelId(String(node.url));
      list[i] = { ...node, channelId };
      results.push({ id, channelId, status: 'resolved' });
    } catch (err) {
      results.push({ id, error: redact(err instanceof Error ? err.message : String(err)), status: 'failed' });
    }
  }
  if (results.some((r) => r.status === 'resolved')) await updateProfessor('sources', list);
  const failed = results.filter((r) => r.status === 'failed');
  const text = results
    .map((r) => (r.status === 'failed' ? `✗  ${r.id}: ${r.error}` : `✓  ${r.id}: ${r.channelId}${r.status === 'kept' ? ' (already set)' : ''}`))
    .join('\n');
  return { data: results, text, exitCode: failed.length ? EXIT.invalid : EXIT.ok };
};

export default { check, resolve } satisfies Record<string, Command>;
