import { httpGetJson } from '../../lib/http.js';
import { parseLooseDate } from '../../lib/time.js';
import { baseCandidate, type Adapter } from './types.js';

interface HnHit {
  objectID: string;
  title?: string;
  url?: string | null;
  points?: number;
  num_comments?: number;
  created_at?: string;
  created_at_i?: number;
}

/** Hacker News via Algolia search_by_date. Tier 3: discovery only (FR-005). */
export const hnAdapter: Adapter = async (source, ctx) => {
  const minPoints = Number(source.params?.minPoints ?? 100);
  const since = Math.floor(Date.parse(ctx.window.start) / 1000);
  const query = new URLSearchParams({
    tags: 'story',
    numericFilters: `created_at_i>=${since},points>=${minPoints}`,
    hitsPerPage: '50',
  });
  const body = await httpGetJson<{ hits: HnHit[] }>(`${source.url}?${query}`, { fetchImpl: ctx.fetchImpl });

  return body.hits
    .filter((h) => h.title)
    .map((h) => {
      const discussion = `https://news.ycombinator.com/item?id=${h.objectID}`;
      const c = baseCandidate(source, ctx, {
        title: h.title!,
        url: h.url || discussion,
        publishedAt: parseLooseDate(h.created_at ?? h.created_at_i),
        excerpt: `${h.points ?? 0} points, ${h.num_comments ?? 0} comments on Hacker News`,
      });
      if (h.url) c.supporting = [{ sourceId: source.id, url: discussion, tier: source.tier }];
      return c;
    });
};
