import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderReport } from '../../src/report/render-md.js';
import { DailyReport } from '../../src/schemas/report.js';
import { fixture } from '../helpers.js';

const draft = JSON.parse(readFileSync(fixture('drafts', 'valid-basic.json'), 'utf8'));

function report(extra: Record<string, unknown>) {
  const items = draft.items.map((item: Record<string, unknown>, i: number) => ({
    ...item,
    itemId: `it-${i}`,
    rank: i + 1,
  }));
  return DailyReport.parse({
    reportDate: '2026-10-29',
    generatedAt: '2026-10-29T08:05:00+04:00',
    runId: 'run-test',
    trigger: 'on-demand',
    coveredPeriod: { start: '2026-10-28T08:00:00+04:00', end: '2026-10-29T08:00:00+04:00' },
    catchUp: false,
    executiveSummaryAz: 'x',
    items,
    recommendationsAz: [],
    followUps: [],
    knowledgeCheck: { questionAz: 'q', relatedItemId: 'it-0' },
    unavailableSources: [],
    quality: {
      itemCount: 3,
      verifiedShare: 1,
      duplicatesRemoved: 0,
      droppedAsOld: 0,
      unavailableSourceCount: 0,
      vendorReportedCount: 0,
      notAnalyzedVideos: 0,
    },
    ...extra,
  });
}

describe('report focus and depth', () => {
  it('states the focus and marks items outside it', () => {
    const r = report({ focus: ['security', 'frontend'] });
    r.items[1]!.outsideFocus = true;
    const md = renderReport(r);
    expect(md).toContain('Fokus: security, frontend');
    expect(md).toMatch(/### 2\. .+ \(fokusdan kənar\)/);
    expect(md).not.toMatch(/### 1\. .+ \(fokusdan kənar\)/);
  });

  it('says there is no focus for old or unfocused reports', () => {
    expect(renderReport(report({}))).toContain('Fokus: yoxdur (bütün sahələr bərabər)');
  });

  it('lists only non-default depths', () => {
    const md = renderReport(report({ depthByDomain: { frontend: 'intermediate', security: 'beginner' } }));
    expect(md).toContain('Dərinlik: security — beginner');
    expect(md).not.toContain('frontend — intermediate');
    expect(renderReport(report({}))).not.toContain('Dərinlik:');
  });
});
