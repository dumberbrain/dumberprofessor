import { describe, expect, it } from 'vitest';
import { toCollectorSource } from '../../src/config/professor.js';
import { formatIssues } from '../../src/config/load.js';
import { Source } from '../../src/schemas/config.js';
import { ProfessorConfig } from '../../src/schemas/professor.js';

const base = { domains: [{ id: 'backend', name: 'Backend', description: 'APIs' }] };
const src = { id: 's', kind: 'rss', url: 'https://example.com/feed.xml', tier: 1, domains: ['backend'] };

const issues = (value: unknown) => {
  const r = ProfessorConfig.safeParse(value);
  return r.success ? [] : formatIssues(r.error);
};

describe('ProfessorConfig', () => {
  it('fills defaults for a minimal file', () => {
    const cfg = ProfessorConfig.parse(base);
    expect(cfg.focus).toEqual([]);
    expect(cfg.ranking).toEqual({ priorityTechnologies: [], ignoredTopics: [] });
    expect(cfg.schedule).toEqual({ enabled: false, generationTime: '08:00' });
    expect(cfg.sessionStart.mode).toBe('ask');
    expect(cfg.domains[0]).toMatchObject({ kind: 'technical', depth: 'intermediate', curriculum: [] });
  });

  it('defaults a source to lessons with unspecified integration fields', () => {
    const cfg = ProfessorConfig.parse({ ...base, sources: [src] });
    expect(cfg.sources[0]).toMatchObject({
      use: ['lessons'],
      enabled: true,
      purpose: 'unspecified',
      failureBehavior: 'unspecified',
    });
  });

  it('rejects news use on a kind the collector cannot read', () => {
    expect(issues({ ...base, sources: [{ ...src, kind: 'docs', use: ['news'] }] })).toEqual([
      expect.stringContaining('sources.0.use: kind "docs" cannot be collected as news'),
    ]);
  });

  it('reports unknown fields and bad schedule time with their path', () => {
    const found = issues({ ...base, colour: 'red', schedule: { generationTime: '25:00' } });
    expect(found.some((i) => i.startsWith('(root)') && i.includes('colour'))).toBe(true);
    expect(found).toContain('schedule.generationTime: must be HH:mm');
  });

  it('maps a news source to the collector shape', () => {
    const cfg = ProfessorConfig.parse({
      ...base,
      sources: [
        { ...src, kind: 'youtube-channel', url: 'https://www.youtube.com/@x', channelId: 'UC1', use: ['news'] },
      ],
    });
    const mapped = toCollectorSource(cfg.sources[0]!);
    expect(mapped).toMatchObject({ type: 'youtube', name: 's', channelId: 'UC1' });
    expect(Source.safeParse(mapped).success).toBe(true);
  });
});
