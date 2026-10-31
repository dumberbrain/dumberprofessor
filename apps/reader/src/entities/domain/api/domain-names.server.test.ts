import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDomainNames } from './domain-names.server';

vi.mock('next/server', () => ({ connection: async () => {} }));

afterEach(() => {
  delete process.env.PROFESSOR_CONFIG;
});

describe('getDomainNames', () => {
  it('maps domain ids to names from the configuration', async () => {
    process.env.PROFESSOR_CONFIG = resolve(__dirname, '../../../../e2e/fixtures/professor.json');
    expect(await getDomainNames()).toEqual({ security: 'Təhlükəsizlik', english: 'English' });
  });

  it('returns an empty map for a missing or invalid file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'reader-cfg-'));
    process.env.PROFESSOR_CONFIG = join(dir, 'missing.json');
    expect(await getDomainNames()).toEqual({});
    writeFileSync(join(dir, 'bad.json'), '{ nope');
    process.env.PROFESSOR_CONFIG = join(dir, 'bad.json');
    expect(await getDomainNames()).toEqual({});
  });
});
