import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateDraft } from '../../src/report/validate.js';
import { RunEnvelope } from '../../src/schemas/candidate.js';
import { fixture, makeSource } from '../helpers.js';

const load = (name: string) => JSON.parse(readFileSync(fixture('drafts', name), 'utf8'));
const run = RunEnvelope.parse(load('run-candidates.json'));
const ctx = {
  sources: [
    makeSource({ id: 'hacker-news', type: 'hn', url: 'https://hn.algolia.com/api/v1/search_by_date', tier: 3 }),
    makeSource({ id: 'yt-jherr', type: 'youtube', url: 'https://www.youtube.com/@jherr', tier: 4 }),
  ],
};

const errorsFor = (draft: unknown) => {
  const result = validateDraft(draft, run, ctx);
  return result.ok ? [] : result.errors;
};

describe('validateDraft', () => {
  it('accepts the valid fixtures', () => {
    expect(errorsFor(load('valid-basic.json'))).toEqual([]);
    expect(errorsFor(load('valid-few-items.json'))).toEqual([]);
  });

  it.each([
    ['invalid-no-source.json', 'items.0.primarySource'],
    ['invalid-verified-no-evidence.json', 'items.0.claims.0.evidenceUrl'],
    ['invalid-update-no-updateOf.json', 'items.0.updateOf'],
    ['invalid-breaking-unknown-date.json', 'items.0.category'],
    ['invalid-unknown-candidate.json', 'items.0.candidateId'],
  ])('rejects %s with an error at %s', (name, path) => {
    expect(errorsFor(load(name)).some((e) => e.startsWith(path))).toBe(true);
  });

  it('requires fewItemsNote when fewer than 3 items', () => {
    const draft = load('valid-few-items.json');
    delete draft.fewItemsNote;
    expect(errorsFor(draft).some((e) => e.startsWith('fewItemsNote'))).toBe(true);
  });

  it('rejects more than 7 items', () => {
    const draft = load('valid-basic.json');
    draft.items = Array.from({ length: 8 }, () => draft.items[0]);
    expect(errorsFor(draft).some((e) => e.startsWith('items'))).toBe(true);
  });

  it('rejects the same candidate twice', () => {
    const draft = load('valid-basic.json');
    draft.items[1] = { ...draft.items[0] };
    expect(errorsFor(draft).some((e) => e.startsWith('items.1.candidateId'))).toBe(true);
  });

  it('requires notAnalyzed for a video whose transcript was unavailable', () => {
    const draft = load('valid-basic.json');
    const video = {
      ...draft.items[0],
      candidateId: 'aaaaaaaaaaa4',
      primarySource: { url: 'https://youtube.com/watch?v=abc', name: 'Jack Herrington', tier: 4 },
      claims: [],
    };
    draft.items[2] = { ...video, video: { notAnalyzed: false, keyPoints: [] } };
    expect(errorsFor(draft).some((e) => e.startsWith('items.2.video.notAnalyzed'))).toBe(true);
    draft.items[2] = { ...video };
    expect(errorsFor(draft).some((e) => e.startsWith('items.2.video'))).toBe(true);
    draft.items[2] = { ...video, video: { notAnalyzed: true, keyPoints: [] } };
    expect(errorsFor(draft)).toEqual([]);
  });

  it('rejects verification evidence from discovery or learning sources', () => {
    const draft = load('valid-basic.json');
    draft.items[0].claims[0].evidenceUrl = 'https://news.ycombinator.com/item?id=1';
    expect(errorsFor(draft).some((e) => e.startsWith('items.0.claims.0.evidenceUrl'))).toBe(true);
  });

  it('rejects a primary source that does not trace to the candidate or verified evidence', () => {
    const draft = load('valid-basic.json');
    draft.items[1].primarySource.url = 'https://made-up.example.org/x';
    expect(errorsFor(draft).some((e) => e.startsWith('items.1.primarySource.url'))).toBe(true);
  });

  it('rejects changed discovery dates and invented publication dates', () => {
    const draft = load('valid-basic.json');
    draft.items[0].discoveredAt = '2026-10-01T00:00:00Z';
    expect(errorsFor(draft).some((e) => e.startsWith('items.0.discoveredAt'))).toBe(true);
  });

  it('requires the knowledge check to reference a reported item', () => {
    const draft = load('valid-basic.json');
    draft.knowledgeCheck.relatedCandidateId = 'aaaaaaaaaaa5';
    expect(errorsFor(draft).some((e) => e.startsWith('knowledgeCheck.relatedCandidateId'))).toBe(true);
  });

  it('requires the draft to belong to the run', () => {
    const draft = load('valid-basic.json');
    draft.runId = 'other';
    expect(errorsFor(draft).some((e) => e.startsWith('runId'))).toBe(true);
  });
});

describe('validateDraft focus (Principle IX)', () => {
  it('rejects a draft whose focus differs from the run', () => {
    const focusedRun = RunEnvelope.parse({ ...load('run-candidates.json'), focus: ['security'] });
    const result = validateDraft(load('valid-basic.json'), focusedRun, ctx);
    expect(result.ok ? [] : result.errors).toContain("focus: must equal the run's focus [security] (Principle IX)");
    const ok = validateDraft({ ...load('valid-basic.json'), focus: ['security'] }, focusedRun, ctx);
    expect(ok.ok).toBe(true);
  });
});
