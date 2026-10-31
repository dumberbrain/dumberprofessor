import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { run } from '../../src/cli/index.js';
import { withConfig } from '../helpers.js';

// SC-003: every common mistake is reported with its field path; nothing is half-applied.
const domain = { id: 'backend', name: 'Backend', description: 'APIs' };
const source = { id: 's', kind: 'rss', url: 'https://example.com/feed.xml', tier: 1, domains: ['backend'] };
const valid = { domains: [domain], sources: [source] };

afterEach(() => {
  delete process.env.FP_DATA_DIR;
});

const cases: [string, unknown, string][] = [
  ['unknown top-level field', { ...valid, focuss: [] }, '(root)'],
  ['id not kebab-case', { domains: [{ ...domain, id: 'Back End' }] }, 'domains.0.id: must be kebab-case'],
  ['duplicate domain id', { domains: [domain, domain] }, 'domains.1.id: duplicate id'],
  ['duplicate source id', { ...valid, sources: [source, source] }, 'sources.1.id: duplicate id'],
  ['bad URL', { ...valid, sources: [{ ...source, url: 'not a url' }] }, 'sources.0.url'],
  ['tier out of range', { ...valid, sources: [{ ...source, tier: 5 }] }, 'sources.0.tier'],
  ['unknown focus id', { ...valid, focus: ['beckend'] }, 'focus.0: unknown domain "beckend" (did you mean "backend"?)'],
  [
    'news on a docs source',
    { ...valid, sources: [{ ...source, kind: 'docs', use: ['news'] }] },
    'sources.0.use: kind "docs" cannot be collected as news',
  ],
  ['too many quiz questions', { ...valid, lesson: { quizQuestions: 11 } }, 'lesson.quizQuestions'],
  ['bad schedule time', { ...valid, schedule: { generationTime: '8am' } }, 'schedule.generationTime: must be HH:mm'],
  ['missing domains', { sources: [] }, 'domains'],
  ['unknown depth', { domains: [{ ...domain, depth: 'deep' }] }, 'domains.0.depth'],
];

describe('config errors', () => {
  it.each(cases)('%s', async (_name, value, expected) => {
    withConfig(value);
    const res = await run(['config', 'check']);
    expect(res.exitCode).toBe(1);
    expect(res.stderr).toContain(expected);
  });

  it('reports invalid JSON with line and column', async () => {
    const { configDir } = withConfig(null);
    writeFileSync(join(configDir, 'professor.json'), '{\n  "domains": [\n    }\n}');
    const res = await run(['config', 'check']);
    expect(res.exitCode).toBe(1);
    expect(res.stderr).toMatch(/line 3, column 5/);
  });

  it('refuses a system write that would make the file invalid, leaving it unchanged', async () => {
    withConfig(valid);
    expect((await run(['focus', 'set', 'nope'])).exitCode).toBe(1);
    expect((await run(['config', 'check'])).exitCode).toBe(0);
  });
});
