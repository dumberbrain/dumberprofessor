import 'server-only';
import { readFile } from 'node:fs/promises';
import { connection } from 'next/server';
import { z } from 'zod';
import { serverEnv } from '@/shared/config/env.server';

// Only the domain names are read from the Professor configuration; it is never written.
const Config = z.object({ domains: z.array(z.object({ id: z.string(), name: z.string() })) });

export type DomainNames = Record<string, string>;

export async function getDomainNames(): Promise<DomainNames> {
  await connection();
  try {
    const parsed = Config.safeParse(JSON.parse(await readFile(serverEnv().professorConfig, 'utf8')));
    return parsed.success ? Object.fromEntries(parsed.data.domains.map((d) => [d.id, d.name])) : {};
  } catch {
    return {};
  }
}
