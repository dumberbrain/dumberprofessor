import { appendFile, mkdir, readFile, rename, writeFile, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { z } from 'zod';

/** Root of personal data; overridable for tests. */
export function dataRoot(): string {
  return resolve(process.env.FP_DATA_DIR ?? 'data');
}

export function dataPath(...parts: string[]): string {
  return join(dataRoot(), ...parts);
}

export class ImmutableExistsError extends Error {
  constructor(readonly path: string) {
    super(`refusing to overwrite immutable file: ${path}`);
    this.name = 'ImmutableExistsError';
  }
}

export async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Write via temp file + rename so readers never see a partial file. */
export async function writeAtomic(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, content, 'utf8');
  await rename(tmp, path);
}

export async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  await writeAtomic(path, `${JSON.stringify(value, null, 2)}\n`);
}

/** Write a file that must never be overwritten (FR-021). */
export async function writeOnce(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  try {
    await writeFile(path, content, { encoding: 'utf8', flag: 'wx' });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EEXIST') throw new ImmutableExistsError(path);
    throw err;
  }
}

export async function readJson<S extends z.ZodType>(path: string, schema: S): Promise<z.infer<S>> {
  return schema.parse(JSON.parse(await readFile(path, 'utf8')));
}

export async function readJsonOr<S extends z.ZodType>(
  path: string,
  schema: S,
  fallback: z.infer<S>,
): Promise<z.infer<S>> {
  if (!(await exists(path))) return fallback;
  return readJson(path, schema);
}

export async function appendJsonl(path: string, rows: unknown[]): Promise<void> {
  if (rows.length === 0) return;
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, rows.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
}

export async function readJsonl<S extends z.ZodType>(path: string, schema: S): Promise<z.infer<S>[]> {
  if (!(await exists(path))) return [];
  const text = await readFile(path, 'utf8');
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => schema.parse(JSON.parse(line)));
}
