import { afterEach, describe, expect, it } from 'vitest';
import { HttpError, httpGet, redact } from '../../src/lib/http.js';
import { run } from '../../src/cli/index.js';
import { stubFetch } from '../helpers.js';

const TOKEN = 'ghp_supersecrettoken1234567890';

afterEach(() => {
  delete process.env.GITHUB_TOKEN;
});

describe('secrets never leak (constitution: Security & Trust)', () => {
  it('redacts the GITHUB_TOKEN value and bearer tokens', () => {
    process.env.GITHUB_TOKEN = TOKEN;
    expect(redact(`failed with ${TOKEN}`)).toBe('failed with [REDACTED]');
    expect(redact('Authorization: Bearer abc.def-123')).toBe('Authorization: Bearer [REDACTED]');
  });

  it('sends the token only to api.github.com', async () => {
    process.env.GITHUB_TOKEN = TOKEN;
    const seen: Record<string, string | undefined> = {};
    const fetchImpl = async (url: string, init?: RequestInit) => {
      seen[new URL(url).hostname] = (init?.headers as Record<string, string>)?.Authorization;
      return new Response('ok');
    };
    await httpGet('https://api.github.com/advisories', { fetchImpl });
    await httpGet('https://evil.example/x', { fetchImpl });
    expect(seen['api.github.com']).toBe(`Bearer ${TOKEN}`);
    expect(seen['evil.example']).toBeUndefined();
  });

  it('keeps tokens out of HTTP error messages', async () => {
    process.env.GITHUB_TOKEN = TOKEN;
    const fetchImpl = stubFetch({});
    await expect(httpGet(`https://example.com/?t=${TOKEN}`, { fetchImpl })).rejects.toSatisfy(
      (e: unknown) => e instanceof HttpError && !e.message.includes(TOKEN),
    );
  });

  it('retries once on 5xx, not on 4xx', async () => {
    const fetchImpl = stubFetch({ 'five.example': [503, 'x'], 'four.example': [404, 'x'] });
    await expect(httpGet('https://five.example/', { fetchImpl })).rejects.toThrow(/503/);
    await expect(httpGet('https://four.example/', { fetchImpl })).rejects.toThrow(/404/);
    expect(fetchImpl.calls.filter((c) => c.includes('five')).length).toBe(2);
    expect(fetchImpl.calls.filter((c) => c.includes('four')).length).toBe(1);
  });

  it('redacts secrets in CLI error output', async () => {
    process.env.GITHUB_TOKEN = TOKEN;
    const res = await run(['record-failure', '--run', 'x']);
    expect(res.stderr).not.toContain(TOKEN);
    const res2 = await run(['save-report', `C:/missing/${TOKEN}.json`]);
    expect(res2.stderr).not.toContain(TOKEN);
  });
});
