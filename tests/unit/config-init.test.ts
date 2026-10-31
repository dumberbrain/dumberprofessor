import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { run } from '../../src/cli/index.js';
import { withConfig } from '../helpers.js';

afterEach(() => {
  delete process.env.FP_DATA_DIR;
});

describe('missing configuration', () => {
  it('creates the default file on first use', async () => {
    const { configDir } = withConfig(null);
    const res = await run(['config', 'check']);
    expect(res.exitCode).toBe(0);
    const cfg = JSON.parse(readFileSync(join(configDir, 'professor.json'), 'utf8'));
    expect(cfg.domains.map((d: { id: string }) => d.id)).toEqual(['frontend', 'system-design', 'security', 'ai-llm', 'english']);
  });

  it('fp config init writes the defaults once', async () => {
    const { configDir } = withConfig(null);
    expect((await run(['config', 'init'])).exitCode).toBe(0);
    expect(existsSync(join(configDir, 'professor.json'))).toBe(true);
    expect((await run(['config', 'init'])).exitCode).toBe(3);
  });
});
