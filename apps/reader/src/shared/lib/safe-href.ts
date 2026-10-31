const ALLOWED = new Set(['http:', 'https:', 'mailto:']);

/** Returns the URL when it is safe to put into `href`, otherwise null (no `javascript:`, `data:` …). */
export function safeHref(url: string | undefined | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('#') || trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return trimmed;
  }
  try {
    return ALLOWED.has(new URL(trimmed).protocol) ? trimmed : null;
  } catch {
    // No scheme: a relative path like `lessons/x.md`.
    return /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? null : trimmed;
  }
}

export const isExternal = (href: string) => /^(https?:|mailto:)/i.test(href);
