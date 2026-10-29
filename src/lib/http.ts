export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface HttpOptions {
  fetchImpl?: FetchLike;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

const USER_AGENT = 'frontend-professor/0.1 (personal news digest)';

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(redact(message));
    this.name = 'HttpError';
  }
}

/** Removes secrets (GITHUB_TOKEN value, bearer tokens) from any string bound for logs or output. */
export function redact(text: string): string {
  let out = text.replace(/(Bearer|token)\s+[A-Za-z0-9_\-.]+/gi, '$1 [REDACTED]');
  const token = process.env.GITHUB_TOKEN;
  if (token && token.length >= 8) out = out.split(token).join('[REDACTED]');
  return out;
}

function authHeaders(url: string): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  if (token && new URL(url).hostname === 'api.github.com') {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

async function once(url: string, opts: HttpOptions): Promise<Response> {
  const fetchImpl = opts.fetchImpl ?? (globalThis.fetch as FetchLike);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15_000);
  try {
    return await fetchImpl(url, {
      headers: { 'User-Agent': USER_AGENT, ...authHeaders(url), ...opts.headers },
      signal: controller.signal,
      redirect: 'follow',
    });
  } finally {
    clearTimeout(timer);
  }
}

/** GET with one retry on network errors and 5xx. Throws HttpError with a redacted message. */
export async function httpGet(url: string, opts: HttpOptions = {}): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await once(url, opts);
      if (res.status >= 500) {
        lastError = new HttpError(`HTTP ${res.status} for ${url}`, res.status);
        continue;
      }
      if (!res.ok) throw new HttpError(`HTTP ${res.status} for ${url}`, res.status);
      return await res.text();
    } catch (err) {
      if (err instanceof HttpError && err.status !== undefined && err.status < 500) throw err;
      lastError = err;
    }
  }
  if (lastError instanceof HttpError) throw lastError;
  throw new HttpError(`request failed for ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

export async function httpGetJson<T = unknown>(url: string, opts: HttpOptions = {}): Promise<T> {
  return JSON.parse(await httpGet(url, opts)) as T;
}
