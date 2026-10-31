import 'server-only';
import { isAbsolute, resolve } from 'node:path';
import { z } from 'zod';

// The app runs from apps/reader (npm workspace); the library lives at the repository root.
const repoRoot = resolve(process.cwd(), '..', '..');
const fromRoot = (path: string) => (isAbsolute(path) ? path : resolve(repoRoot, path));

const Env = z.object({
  DOCUMENTS_DIR: z.string().min(1).default('documents'),
  PROFESSOR_CONFIG: z.string().min(1).default('config/professor.json'),
});

/** Read on every call so tests (and a changed env) take effect without a restart. */
export function serverEnv() {
  const env = Env.parse({ DOCUMENTS_DIR: process.env.DOCUMENTS_DIR, PROFESSOR_CONFIG: process.env.PROFESSOR_CONFIG });
  return { documentsDir: fromRoot(env.DOCUMENTS_DIR), professorConfig: fromRoot(env.PROFESSOR_CONFIG) };
}
