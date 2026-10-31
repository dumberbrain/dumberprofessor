import { cpSync, mkdtempSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { beforeAll, beforeEach } from 'vitest';

// Tests never read or write the real config/: each test file works on its own copy.
let copy: string;

beforeAll(() => {
  copy = mkdtempSync(join(tmpdir(), 'fp-config-'));
  const source = resolve('config');
  for (const name of readdirSync(source)) {
    if (statSync(join(source, name)).isFile()) cpSync(join(source, name), join(copy, name));
  }
});

beforeEach(() => {
  process.env.FP_CONFIG_DIR = copy;
  // documents/ is the user's library: tests write to a throwaway one
  process.env.FP_DOCS_DIR = mkdtempSync(join(tmpdir(), 'fp-docs-'));
});
