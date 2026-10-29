import { httpGet, type FetchLike } from '../../lib/http.js';
import { parseLooseDate } from '../../lib/time.js';
import type { Candidate } from '../../schemas/candidate.js';
import { baseCandidate, type Adapter } from './types.js';
import { asArray, parseXml, text } from './xml.js';

type Node = Record<string, unknown>;

const CHANNEL_ID = /UC[\w-]{22}/;

/** Reads the canonical /channel/UC… id from a @handle page. */
export async function resolveChannelId(handleUrl: string, fetchImpl?: FetchLike): Promise<string> {
  const html = await httpGet(handleUrl, { fetchImpl });
  const patterns = [
    /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/,
    /"externalId":"(UC[\w-]{22})"/,
    /"channelId":"(UC[\w-]{22})"/,
  ];
  for (const p of patterns) {
    const m = p.exec(html);
    if (m?.[1]) return m[1];
  }
  throw new Error(`could not find a channel id on ${handleUrl}`);
}

export function channelFeedUrl(channelId: string): string {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}

/** Public channel feed + optional transcript per new video (research.md R5, FR-006a). */
export const youtubeAdapter: Adapter = async (source, ctx) => {
  if (!source.channelId || !CHANNEL_ID.test(source.channelId)) {
    throw new Error(`channelId missing for ${source.id}; run "fp sources resolve"`);
  }
  const doc = parseXml(await httpGet(channelFeedUrl(source.channelId), { fetchImpl: ctx.fetchImpl }));
  const feed = doc.feed as Node | undefined;
  if (!feed) throw new Error(`not a YouTube channel feed: ${source.id}`);
  const channel = text((feed.author as Node | undefined)?.name) ?? text(feed.title) ?? source.name;
  const windowStart = Date.parse(ctx.window.start);

  const out: Candidate[] = [];
  for (const entry of asArray(feed.entry as Node | Node[] | undefined)) {
    const videoId = text(entry['yt:videoId']);
    if (!videoId) continue;
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const publishedAt = parseLooseDate(text(entry.published));
    const group = entry['media:group'] as Node | undefined;
    const inWindow = publishedAt !== null && Date.parse(publishedAt) >= windowStart;
    const transcript =
      inWindow && ctx.transcripts
        ? await ctx.transcripts(url)
        : { status: 'unavailable' as const, reason: inWindow ? 'transcripts disabled' : 'outside reporting window' };
    out.push({
      ...baseCandidate(source, ctx, {
        title: text(entry.title) ?? url,
        url,
        publishedAt,
        excerpt: text(group?.['media:description']),
      }),
      video: { channel, transcript },
    });
  }
  return out;
};
