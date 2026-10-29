import { httpGet } from '../../lib/http.js';
import { parseLooseDate } from '../../lib/time.js';
import type { Candidate } from '../../schemas/candidate.js';
import { baseCandidate, type Adapter } from './types.js';
import { asArray, parseXml, text } from './xml.js';

type Node = Record<string, unknown>;

function atomLink(entry: Node): string | undefined {
  const links = asArray(entry.link as Node | Node[] | undefined);
  const alternate = links.find((l) => !l['@_rel'] || l['@_rel'] === 'alternate');
  return (alternate?.['@_href'] as string | undefined) ?? text(entry.link);
}

/** RSS 2.0 and Atom feeds (research.md R4). */
export const rssAdapter: Adapter = async (source, ctx) => {
  const doc = parseXml(await httpGet(source.url, { fetchImpl: ctx.fetchImpl }));
  const out: Candidate[] = [];

  const channel = (doc.rss as Node | undefined)?.channel as Node | undefined;
  for (const item of asArray(channel?.item as Node | Node[] | undefined)) {
    const url = text(item.link) ?? text(item.guid);
    if (!url) continue;
    out.push(
      baseCandidate(source, ctx, {
        title: text(item.title) ?? url,
        url,
        publishedAt: parseLooseDate(text(item.pubDate) ?? text(item['dc:date'])),
        excerpt: text(item.description) ?? text(item['content:encoded']),
      }),
    );
  }

  const feed = doc.feed as Node | undefined;
  for (const entry of asArray(feed?.entry as Node | Node[] | undefined)) {
    const url = atomLink(entry);
    if (!url) continue;
    out.push(
      baseCandidate(source, ctx, {
        title: text(entry.title) ?? url,
        url,
        publishedAt: parseLooseDate(text(entry.published) ?? text(entry.updated)),
        excerpt: text(entry.summary) ?? text(entry.content),
      }),
    );
  }

  if (!channel && !feed) throw new Error(`not an RSS or Atom feed: ${source.url}`);
  return out;
};
