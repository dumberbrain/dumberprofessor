import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createFollowUp, dismissFollowUp, listFollowUps, resolveFollowUp } from '../../src/store/followups.js';
import { validateDraft } from '../../src/report/validate.js';
import { RunEnvelope } from '../../src/schemas/candidate.js';
import { fixture, tempDir } from '../helpers.js';

const at = '2026-10-29T08:00:00+04:00';

describe('follow-up lifecycle', () => {
  beforeEach(() => {
    process.env.FP_DATA_DIR = tempDir();
  });
  afterEach(() => {
    delete process.env.FP_DATA_DIR;
  });

  it('open → resolved, with the resolving item recorded', async () => {
    const f = await createFollowUp('2026-10-20-1', 'beta → stable gözlənilir', at);
    expect(f.status).toBe('open');
    await resolveFollowUp(f.followUpId, '2026-10-29-1', at);
    const [stored] = await listFollowUps();
    expect(stored).toMatchObject({ status: 'resolved', resolvedBy: '2026-10-29-1' });
    expect(await listFollowUps('open')).toEqual([]);
  });

  it('open → dismissed', async () => {
    const f = await createFollowUp('2026-10-20-1', 'izlə', at);
    await dismissFollowUp(f.followUpId, at);
    expect((await listFollowUps('dismissed')).map((x) => x.followUpId)).toEqual([f.followUpId]);
  });

  it('allows no transitions out of terminal states', async () => {
    const f = await createFollowUp('2026-10-20-1', 'izlə', at);
    await dismissFollowUp(f.followUpId, at);
    await expect(resolveFollowUp(f.followUpId, 'x', at)).rejects.toThrow(/not open/);
    await expect(dismissFollowUp(f.followUpId, at)).rejects.toThrow(/not open/);
    await expect(dismissFollowUp('missing', at)).rejects.toThrow(/not found/);
  });

  it('assigns unique ids', async () => {
    const a = await createFollowUp('x-1', 'a', at);
    const b = await createFollowUp('x-2', 'b', at);
    expect(a.followUpId).not.toBe(b.followUpId);
  });
});

describe('update validation (FR-008, FR-008a)', () => {
  const load = (name: string) => JSON.parse(readFileSync(fixture('drafts', name), 'utf8'));
  const baseRun = RunEnvelope.parse(load('run-candidates.json'));
  const run = { ...baseRun, candidates: baseRun.candidates.map((c) => (c.candidateId === 'aaaaaaaaaaa2' ? { ...c, possibleUpdateOf: '2026-10-20-1' } : c)) };
  const ctx = (extra = {}) => ({ sources: [], indexItemIds: new Set(['2026-10-20-1']), openFollowUpIds: new Set(['fu-1']), ...extra });
  const errors = (draft: unknown, c = ctx()) => {
    const r = validateDraft(draft, run, c);
    return r.ok ? [] : r.errors;
  };

  it('accepts a matched candidate reported as an update of the indexed item', () => {
    const draft = load('valid-basic.json');
    Object.assign(draft.items[1], { category: 'update', updateOf: '2026-10-20-1', resolvesFollowUp: 'fu-1' });
    expect(errors(draft)).toEqual([]);
  });

  it('rejects updateOf pointing at an unknown item', () => {
    const draft = load('valid-basic.json');
    Object.assign(draft.items[1], { category: 'update', updateOf: '2026-01-01-9' });
    expect(errors(draft).some((e) => e.startsWith('items.1.updateOf'))).toBe(true);
  });

  it('rejects a matched candidate presented as new without an explanation', () => {
    const draft = load('valid-basic.json');
    expect(errors(draft).some((e) => e.startsWith('items.1.category'))).toBe(true);
    draft.excludedMatches = [{ candidateId: 'aaaaaaaaaaa2', reason: 'false match: different feature' }];
    expect(errors(draft)).toEqual([]);
  });

  it('rejects a matched candidate that is omitted without an excludedMatches entry', () => {
    const draft = load('valid-basic.json');
    draft.items.splice(1, 1);
    draft.fewItemsNote = 'az';
    expect(errors(draft).some((e) => e.startsWith('excludedMatches'))).toBe(true);
    draft.excludedMatches = [{ candidateId: 'aaaaaaaaaaa2', reason: 'only new commentary' }];
    expect(errors(draft)).toEqual([]);
  });

  it('rejects resolving a follow-up that is not open', () => {
    const draft = load('valid-basic.json');
    Object.assign(draft.items[1], { category: 'update', updateOf: '2026-10-20-1', resolvesFollowUp: 'fu-closed' });
    expect(errors(draft).some((e) => e.startsWith('items.1.resolvesFollowUp'))).toBe(true);
  });

  it('requires new follow-ups to reference reported items', () => {
    const draft = load('valid-basic.json');
    draft.excludedMatches = [{ candidateId: 'aaaaaaaaaaa2', reason: 'false match' }];
    draft.newFollowUps = [{ candidateId: 'aaaaaaaaaaa5', reasonAz: 'izlə' }];
    expect(errors(draft).some((e) => e.startsWith('newFollowUps.0.candidateId'))).toBe(true);
  });
});
