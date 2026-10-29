import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DraftItem, ReportDraft } from '../../src/schemas/report.js';
import { RunEnvelope } from '../../src/schemas/candidate.js';

const fixtures = join(import.meta.dirname, '../fixtures/drafts');
const load = (name: string) => JSON.parse(readFileSync(join(fixtures, name), 'utf8'));
const jsonSchema = JSON.parse(
  readFileSync(join(import.meta.dirname, '../../specs/001-daily-news-report/contracts/report-draft.schema.json'), 'utf8'),
);

describe('report draft contract', () => {
  it.each(readdirSync(fixtures).filter((f) => f.startsWith('valid-')))('accepts %s', (name) => {
    expect(ReportDraft.safeParse(load(name)).success).toBe(true);
  });

  it.each([
    ['invalid-no-source.json', 'primarySource'],
    ['invalid-verified-no-evidence.json', 'evidenceUrl'],
    ['invalid-update-no-updateOf.json', 'updateOf'],
  ])('rejects %s at %s', (name, field) => {
    const result = ReportDraft.safeParse(load(name));
    expect(result.success).toBe(false);
    expect(result.error!.issues.some((i) => i.path.includes(field))).toBe(true);
  });

  it('run fixture matches the run envelope schema', () => {
    expect(RunEnvelope.safeParse(load('run-candidates.json')).success).toBe(true);
  });

  it('zod and JSON Schema agree on top-level and item fields', () => {
    const zodTop = Object.keys(ReportDraft.shape).sort();
    const jsonTop = Object.keys(jsonSchema.properties).sort();
    expect(zodTop).toEqual(jsonTop);
    expect([...jsonSchema.required].sort()).toEqual(
      zodTop.filter((k) => !ReportDraft.shape[k as keyof typeof ReportDraft.shape].safeParse(undefined).success),
    );

    const zodItem = Object.keys(DraftItem.shape).sort();
    const jsonItem = Object.keys(jsonSchema.$defs.newsItem.properties).sort();
    expect(zodItem).toEqual(jsonItem);
  });
});
