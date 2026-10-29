import type { Source } from '../../schemas/config.js';

/**
 * Sources without a feed are not fetched by the CLI: they are handed to the skill, which reads
 * them with WebFetch (research.md R4). Keeps fragile HTML scraping out of the deterministic code.
 */
export function toVisit(sources: Source[]): Source[] {
  return sources.filter((s) => s.enabled && s.type === 'web');
}
