import { httpGetJson } from '../../lib/http.js';
import { parseLooseDate } from '../../lib/time.js';
import type { Candidate } from '../../schemas/candidate.js';
import { baseCandidate, type Adapter } from './types.js';

interface Advisory {
  ghsa_id: string;
  cve_id?: string | null;
  html_url: string;
  summary: string;
  description?: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical' | 'unknown';
  published_at: string;
  vulnerabilities?: { package?: { name?: string } }[];
}

/** GitHub Advisory Database REST API, one request per configured severity. */
export const githubAdvisoriesAdapter: Adapter = async (source, ctx) => {
  const ecosystem = String(source.params?.ecosystem ?? 'npm');
  const severities = ([] as unknown[]).concat(source.params?.severity ?? ['high', 'critical']).map(String);
  const since = ctx.window.start.slice(0, 10);

  const out: Candidate[] = [];
  for (const severity of severities) {
    const query = new URLSearchParams({ ecosystem, severity, published: `>=${since}`, per_page: '50' });
    const advisories = await httpGetJson<Advisory[]>(`${source.url}?${query}`, {
      fetchImpl: ctx.fetchImpl,
      headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    });
    for (const a of advisories) {
      const packages = [...new Set((a.vulnerabilities ?? []).map((v) => v.package?.name).filter(Boolean))];
      const ids = [a.cve_id, ...packages].filter(Boolean).join('; ');
      out.push({
        ...baseCandidate(source, ctx, {
          title: ids ? `${a.summary} (${ids})` : a.summary,
          url: a.html_url,
          publishedAt: parseLooseDate(a.published_at),
          excerpt: a.description,
        }),
        severity: a.severity === 'unknown' ? undefined : a.severity,
      });
    }
  }
  return out;
};
