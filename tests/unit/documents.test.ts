import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { run } from '../../src/cli/index.js';
import { RunEnvelope } from '../../src/schemas/candidate.js';
import { slugify } from '../../src/store/documents.js';
import { writeRun, writeRunLog } from '../../src/store/runs.js';
import { fixture, withConfig } from '../helpers.js';
import { seedReport } from '../store-helpers.js';

const config = {
  domains: [
    { id: 'backend', name: 'Backend', description: 'APIs' },
    { id: 'english', name: 'English', description: 'Language', kind: 'language' },
  ],
};

let dataDir: string;
const docs = () => process.env.FP_DOCS_DIR!;
const draft = (body: string) => {
  mkdirSync(join(dataDir, 'drafts'), { recursive: true });
  const path = join(dataDir, 'drafts', 'doc.md');
  writeFileSync(path, body);
  return path;
};

beforeEach(() => {
  ({ dataDir } = withConfig(config));
});
afterEach(() => {
  delete process.env.FP_DATA_DIR;
});

describe('slugify', () => {
  it('transliterates Azerbaijani letters and drops punctuation', () => {
    expect(slugify('İndekslər: B-ağacı və Şərtlər!')).toBe('indeksler-b-agaci-ve-sertler');
    expect(slugify('???')).toBe('document');
  });
});

describe('fp doc save', () => {
  it('files a lesson with front matter, removes the draft and indexes it', async () => {
    const path = draft('## Indexes\n\nB-tree basics.');
    const res = await run([
      'doc', 'save', '--type', 'lesson', '--domain', 'backend', '--title', 'Database indexes',
      '--sources', 'https://www.postgresql.org/docs/; https://use-the-index-luke.com', '--date', '2026-10-31', path,
    ]);
    expect(res.exitCode).toBe(0);
    const file = join(docs(), 'backend', 'lessons', '2026-10-31-database-indexes.md');
    const text = readFileSync(file, 'utf8');
    expect(text).toMatch(/^---\ntitle: Database indexes\ntype: lesson\ndomain: backend\ndate: "?2026-10-31"?\nsources:\n {2}- https:\/\/www\.postgresql\.org\/docs\//);
    expect(text).toContain('B-tree basics.');
    expect(existsSync(path)).toBe(false);

    const index = readFileSync(join(docs(), 'README.md'), 'utf8');
    expect(index).toContain('## Backend');
    expect(index).toContain('- 2026-10-31 — [Database indexes](backend/lessons/2026-10-31-database-indexes.md)');
  });

  it('never overwrites a document with the same title and date', async () => {
    const args = ['doc', 'save', '--type', 'research', '--domain', 'backend', '--title', 'CAP', '--date', '2026-10-31'];
    await run([...args, draft('one')]);
    await run([...args, draft('two')]);
    expect(readFileSync(join(docs(), 'backend', 'research', '2026-10-31-cap.md'), 'utf8')).toContain('one');
    expect(readFileSync(join(docs(), 'backend', 'research', '2026-10-31-cap-2.md'), 'utf8')).toContain('two');
  });

  it('--auto saves only when documents.autoSave is on', async () => {
    const args = ['doc', 'save', '--type', 'research', '--domain', 'backend', '--title', 'CAP', '--date', '2026-10-31', '--auto'];
    expect((await run([...args, draft('kept')])).exitCode).toBe(0);
    ({ dataDir } = withConfig({ ...config, documents: { autoSave: false } }));
    const path = draft('dropped');
    const res = await run([...args, path]);
    expect(res.exitCode).toBe(2);
    expect(res.stdout).toContain('auto-save is off');
    expect(existsSync(path)).toBe(false);
  });

  it('rejects unknown domains and types', async () => {
    expect((await run(['doc', 'save', '--type', 'lesson', '--domain', 'beckend', '--title', 'x', draft('x')])).stderr).toContain(
      'did you mean "backend"',
    );
    expect((await run(['doc', 'save', '--type', 'poem', '--domain', 'backend', '--title', 'x', draft('x')])).exitCode).toBe(1);
  });
});

describe('news documents', () => {
  it('fp doc news copies a stored report', async () => {
    await seedReport('2026-10-29');
    const res = await run(['doc', 'news', '2026-10-29']);
    expect(res.exitCode).toBe(0);
    const text = readFileSync(join(docs(), 'news', '2026-10-29.md'), 'utf8');
    expect(text).toContain('type: news');
    expect(text).toContain('# Gündəlik hesabat — 2026-10-29');
    expect(readFileSync(join(docs(), 'README.md'), 'utf8')).toContain('## Xəbərlər');
  });

  it('fp doc list filters compactly', async () => {
    await run(['doc', 'save', '--type', 'lesson', '--domain', 'english', '--title', 'Articles a/the', '--date', '2026-10-30', draft('x')]);
    await run(['doc', 'save', '--type', 'lesson', '--domain', 'backend', '--title', 'Indexes', '--date', '2026-10-31', draft('y')]);
    const out = (await run(['doc', 'list', '--domain', 'english'])).stdout;
    expect(out).toContain('2026-10-30 · lesson · english · Articles a/the');
    expect(out).not.toContain('Indexes');
    expect((await run(['doc', 'list', '--q', 'nothing'])).exitCode).toBe(2);
  });
});

describe('save-report copies the report into the library', () => {
  const domains = ['frontend', 'system-design', 'security', 'ai-llm'].map((id) => ({ id, name: id, description: id }));

  async function saveFixtureReport() {
    const load = (name: string) => JSON.parse(readFileSync(fixture('drafts', name), 'utf8'));
    const r = RunEnvelope.parse(load('run-candidates.json'));
    await writeRun(r);
    await writeRunLog({ runId: r.runId, trigger: 'on-demand', startedAt: r.window.end, status: 'running' });
    const path = join(process.env.FP_DATA_DIR!, 'draft.json');
    writeFileSync(path, JSON.stringify(load('valid-basic.json')));
    return run(['save-report', path]);
  }

  it('when autoSave is on (default)', async () => {
    withConfig({ domains });
    const res = await saveFixtureReport();
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('copied to');
    expect(existsSync(join(docs(), 'news', '2026-10-29.md'))).toBe(true);
  });

  it('not when autoSave is off', async () => {
    withConfig({ domains, documents: { autoSave: false } });
    expect((await saveFixtureReport()).exitCode).toBe(0);
    expect(existsSync(join(docs(), 'news'))).toBe(false);
  });
});
