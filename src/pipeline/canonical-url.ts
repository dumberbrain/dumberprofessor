import { createHash } from 'node:crypto';

const TRACKING_PARAMS = /^(utm_.+|ref|ref_src|fbclid|gclid|mc_cid|mc_eid|source)$/i;

/** Normalizes a URL so the same page from different links compares equal. */
export function canonicalUrl(raw: string): string {
  const url = new URL(raw);
  url.hash = '';
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  if (url.protocol === 'http:') url.protocol = 'https:';
  // Copy the keys first: deleting while iterating the live iterator would skip entries.
  for (const key of Array.from(url.searchParams.keys())) {
    if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  let out = url.toString();
  if (url.pathname !== '/' && out.endsWith('/')) out = out.slice(0, -1);
  if (url.pathname === '/' && !url.search) out = out.replace(/\/$/, '');
  return out;
}

export function candidateIdFor(canonical: string): string {
  return createHash('sha1').update(canonical).digest('hex').slice(0, 12);
}
