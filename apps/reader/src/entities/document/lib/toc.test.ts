import { describe, expect, it } from 'vitest';
import { showToc, tableOfContents } from './toc';

describe('tableOfContents', () => {
  it('collects h2/h3 with slugger ids, skipping code fences', () => {
    const md = '# T\n\n## Nümunə\n\n```md\n## not a heading\n```\n\n### Alt `kod`\n\n## Nümunə\n';
    expect(tableOfContents(md)).toEqual([
      { id: 'nümunə', text: 'Nümunə', depth: 2 },
      { id: 'alt-kod', text: 'Alt kod', depth: 3 },
      { id: 'nümunə-1', text: 'Nümunə', depth: 2 },
    ]);
  });

  it('is shown only with three or more h2', () => {
    expect(showToc(tableOfContents('## a\n## b\n'))).toBe(false);
    expect(showToc(tableOfContents('## a\n## b\n## c\n'))).toBe(true);
  });
});
