import { describe, expect, it } from 'vitest';
import { candidateIdFor, canonicalUrl } from '../../src/pipeline/canonical-url.js';

describe('canonicalUrl', () => {
  it('strips www, tracking params, fragment and trailing slash', () => {
    expect(canonicalUrl('https://www.React.dev/blog/post/?utm_source=x&ref=hn#top')).toBe(
      'https://react.dev/blog/post',
    );
  });

  it('upgrades http and sorts remaining params', () => {
    expect(canonicalUrl('http://example.com/a?b=2&a=1')).toBe('https://example.com/a?a=1&b=2');
  });

  it('treats the bare host with and without slash as equal', () => {
    expect(canonicalUrl('https://example.com/')).toBe(canonicalUrl('https://example.com'));
  });

  it('keeps meaningful params like YouTube v', () => {
    expect(canonicalUrl('https://www.youtube.com/watch?v=abc&utm_medium=x')).toBe(
      'https://youtube.com/watch?v=abc',
    );
  });
});

describe('candidateIdFor', () => {
  it('is a stable 12-char hex id', () => {
    const id = candidateIdFor('https://react.dev/blog/post');
    expect(id).toMatch(/^[0-9a-f]{12}$/);
    expect(candidateIdFor('https://react.dev/blog/post')).toBe(id);
  });
});
