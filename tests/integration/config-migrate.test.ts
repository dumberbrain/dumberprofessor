import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { run } from '../../src/cli/index.js';
import { withConfig } from '../helpers.js';

const domains = ['frontend', 'system-design', 'security', 'ai-llm'].map((id) => ({ id, name: id, description: id }));
const read = (dir: string) => JSON.parse(readFileSync(join(dir, 'professor.json'), 'utf8'));

afterEach(() => {
  delete process.env.FP_DATA_DIR;
});

describe('fp config migrate', () => {
  it('moves every source, preference and schedule field into professor.json without loss', async () => {
    const { configDir } = withConfig(
      {
        domains,
        sources: [{ id: 'owasp-site', kind: 'web', url: 'https://owasp.org/news', tier: 1, domains: ['security'] }],
      },
      { legacyYaml: true },
    );

    const res = await run(['config', 'migrate']);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('4 sources (1 merged)');
    expect(res.stdout).toContain('3 priority technologies, 1 ignored topic, schedule');

    const cfg = read(configDir);
    expect(cfg.sources).toHaveLength(4);
    const byId = Object.fromEntries(cfg.sources.map((s: { id: string }) => [s.id, s]));
    expect(byId['react-blog']).toMatchObject({ kind: 'rss', use: ['news'], name: 'React Blog', purpose: expect.stringContaining('Official React') });
    expect(byId['hacker-news']).toMatchObject({ kind: 'hn', tier: 3, params: { minPoints: 100 } });
    expect(byId['yt-d-zhiganov']).toMatchObject({ kind: 'youtube-channel', channelId: 'UC_ckAFL4cSnoIQE2tZRiBKg' });
    // same canonical URL as the YAML owasp-news: merged, kept under the user's id
    expect(byId['owasp-site']).toMatchObject({ use: ['lessons', 'news'], enabled: false, purpose: 'OWASP project news' });
    expect(cfg.ranking).toEqual({ priorityTechnologies: ['React', 'TypeScript', 'Web security'], ignoredTopics: ['crypto'] });
    expect(cfg.schedule).toEqual({ enabled: true, generationTime: '07:30', timeZone: 'Asia/Baku' });

    for (const name of ['sources.yml', 'interests.yml', 'settings.yml']) {
      expect(existsSync(join(configDir, name))).toBe(false);
      expect(existsSync(join(configDir, 'legacy', name))).toBe(true);
    }

    const again = await run(['config', 'migrate']);
    expect(again.exitCode).toBe(2);
    expect(again.stdout).toContain('nothing to migrate');
  });

  it('migrates automatically on the first command and creates the file from defaults', async () => {
    const { configDir } = withConfig(null, { legacyYaml: true });
    const res = await run(['config', 'check']);
    expect(res.exitCode).toBe(0);
    const cfg = read(configDir);
    expect(cfg.domains.map((d: { id: string }) => d.id)).toContain('english');
    expect(cfg.sources.filter((s: { use?: string[] }) => s.use?.includes('news'))).toHaveLength(4);
    expect(existsSync(join(configDir, 'legacy', 'sources.yml'))).toBe(true);
  });

  it('adds missing domains referenced by legacy sources instead of failing', async () => {
    const { configDir } = withConfig({ domains: [{ id: 'frontend', name: 'Frontend', description: 'UI' }] }, { legacyYaml: true });
    expect((await run(['config', 'migrate'])).exitCode).toBe(0);
    expect(read(configDir).domains.map((d: { id: string }) => d.id)).toEqual(['frontend', 'system-design', 'security', 'ai-llm']);
  });
});
