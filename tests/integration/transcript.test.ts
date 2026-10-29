import { readFileSync } from 'node:fs';
import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createTranscriptFetcher, parseVtt } from '../../src/collect/transcript.js';
import { TRANSCRIPT_MAX } from '../../src/schemas/candidate.js';
import { fixture } from '../helpers.js';

const vtt = readFileSync(fixture('feeds', 'transcript.en.vtt'), 'utf8');

describe('parseVtt', () => {
  it('converts cues to second offsets, strips inline tags and drops repeated lines', () => {
    expect(parseVtt(vtt)).toEqual([
      { t: 0, text: 'hey everyone' },
      { t: 3, text: 'today we look at server components' },
      { t: 65, text: 'caching changed in version 16.1' },
    ]);
  });
});

describe('createTranscriptFetcher', () => {
  it('reports unavailable when yt-dlp is not installed', async () => {
    const fetcher = createTranscriptFetcher({
      exec: async () => {
        throw Object.assign(new Error('spawn yt-dlp ENOENT'), { code: 'ENOENT' });
      },
    });
    const result = await fetcher('https://www.youtube.com/watch?v=abc');
    expect(result).toEqual({ status: 'unavailable', reason: 'yt-dlp not installed' });
  });

  it('reports unavailable when no subtitles were produced', async () => {
    const fetcher = createTranscriptFetcher({ exec: async () => {} });
    expect((await fetcher('https://www.youtube.com/watch?v=abc')).status).toBe('unavailable');
  });

  it('returns segments and language from the downloaded VTT', async () => {
    const fetcher = createTranscriptFetcher({
      exec: async (_cmd, _args, cwd) => {
        await copyFile(fixture('feeds', 'transcript.en.vtt'), join(cwd, 'video.en.vtt'));
      },
    });
    const result = await fetcher('https://www.youtube.com/watch?v=abc');
    expect(result.status).toBe('ok');
    expect(result.language).toBe('en');
    expect(result.segments).toHaveLength(3);
  });

  it('caps transcript text length', async () => {
    const cue = (i: number) => `00:00:${String(i % 60).padStart(2, '0')}.000 --> 00:00:${String(i % 60).padStart(2, '0')}.500\n${'word '.repeat(50)}${i}\n`;
    const big = `WEBVTT\n\n${Array.from({ length: 400 }, (_, i) => cue(i)).join('\n')}`;
    const fetcher = createTranscriptFetcher({
      exec: async (_cmd, _args, cwd) => {
        const { writeFile } = await import('node:fs/promises');
        await writeFile(join(cwd, 'video.en.vtt'), big);
      },
    });
    const result = await fetcher('https://www.youtube.com/watch?v=abc');
    const total = result.segments!.reduce((n, s) => n + s.text.length, 0);
    expect(total).toBeLessThanOrEqual(TRANSCRIPT_MAX);
  });
});
