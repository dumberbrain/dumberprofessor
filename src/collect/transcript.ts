import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TRANSCRIPT_MAX, type Transcript } from '../schemas/candidate.js';
import type { TranscriptFetcher } from './adapters/types.js';

export type Exec = (cmd: string, args: string[], cwd: string) => Promise<void>;

const defaultExec: Exec = (cmd, args, cwd) =>
  new Promise((resolve, reject) => {
    execFile(cmd, args, { cwd, timeout: 120_000, windowsHide: true }, (err) => (err ? reject(err) : resolve()));
  });

const CUE = /^(\d{2}):(\d{2}):(\d{2})\.\d{3}\s+-->/;

/** WebVTT → [{t: seconds, text}], inline timing/style tags removed, consecutive repeats dropped. */
export function parseVtt(vtt: string): { t: number; text: string }[] {
  const out: { t: number; text: string }[] = [];
  const seen = new Set<string>();
  const lines = vtt.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = CUE.exec(lines[i]!);
    if (!m) continue;
    const t = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
    const textLines: string[] = [];
    while (i + 1 < lines.length && lines[i + 1]!.trim() !== '') textLines.push(lines[++i]!);
    const text = textLines
      .join(' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push({ t, text });
  }
  return out;
}

function capSegments(segments: { t: number; text: string }[]): { t: number; text: string }[] {
  const out: { t: number; text: string }[] = [];
  let total = 0;
  for (const s of segments) {
    if (total + s.text.length > TRANSCRIPT_MAX) break;
    out.push(s);
    total += s.text.length;
  }
  return out;
}

/** yt-dlp subtitle download (research.md R5). Any failure → status "unavailable", never a guess. */
export function createTranscriptFetcher(opts: { exec?: Exec; command?: string } = {}): TranscriptFetcher {
  const exec = opts.exec ?? defaultExec;
  const command = opts.command ?? 'yt-dlp';
  return async (videoUrl: string): Promise<Transcript> => {
    const dir = await mkdtemp(join(tmpdir(), 'fp-yt-'));
    try {
      await exec(
        command,
        [
          '--skip-download',
          '--write-subs',
          '--write-auto-subs',
          '--sub-langs',
          'en.*,ru.*,orig',
          '--sub-format',
          'vtt',
          '-o',
          'video.%(ext)s',
          videoUrl,
        ],
        dir,
      );
      const files = (await readdir(dir)).filter((f) => f.endsWith('.vtt')).sort();
      const file = files.find((f) => /\.en[.-]/.test(f)) ?? files[0];
      if (!file) return { status: 'unavailable', reason: 'no subtitles available' };
      const segments = capSegments(parseVtt(await readFile(join(dir, file), 'utf8')));
      if (segments.length === 0) return { status: 'unavailable', reason: 'empty subtitles' };
      const language = /\.([a-z]{2,3})(?:[-.][\w-]+)?\.vtt$/i.exec(file)?.[1];
      return { status: 'ok', language, segments };
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      return { status: 'unavailable', reason: code === 'ENOENT' ? 'yt-dlp not installed' : 'yt-dlp failed' };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  };
}
