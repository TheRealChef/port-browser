import type { SearchEngine } from '../types/models';

export interface NormalizedInput {
  url: string;
  kind: 'url' | 'search';
  query?: string;
}

const SEARCH_URLS: Record<SearchEngine, string> = {
  duckduckgo: 'https://duckduckgo.com/?q=',
  google: 'https://www.google.com/search?q=',
  bing: 'https://www.bing.com/search?q=',
};

export const SEARCH_ENGINE_LABELS: Record<SearchEngine, string> = {
  duckduckgo: 'DuckDuckGo',
  google: 'Google',
  bing: 'Bing',
};

const LOCAL_HOST = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])(:\d{1,5})?([/?#].*)?$/i;
const IPV4 = /^(\d{1,3}(?:\.\d{1,3}){3})(:\d{1,5})?([/?#].*)?$/;
const DOMAIN = /^([a-z0-9-]+\.)+[a-z]{2,63}\.?(:\d{1,5})?([/?#].*)?$/i;

/** Returns the URL only if it is a well-formed http(s) URL. */
export function toSafeHttpUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function buildSearchUrl(query: string, engine: SearchEngine): string {
  return SEARCH_URLS[engine] + encodeURIComponent(query);
}

/**
 * Turns omnibox input into a navigable http(s) URL. Anything that is not a
 * recognisable web address becomes a search; non-web schemes such as
 * `javascript:` or `file:` are never navigated to.
 */
export function normalizeInput(raw: string, engine: SearchEngine): NormalizedInput | null {
  const input = raw.trim();
  if (!input) return null;

  const search = (): NormalizedInput => ({
    url: buildSearchUrl(input, engine),
    kind: 'search',
    query: input,
  });

  if (/\s/.test(input)) return search();

  const asUrl = (candidate: string): NormalizedInput => {
    const url = toSafeHttpUrl(candidate);
    return url ? { url, kind: 'url' } : search();
  };

  if (/^https?:\/\//i.test(input)) return asUrl(input);
  if (LOCAL_HOST.test(input) || IPV4.test(input)) return asUrl(`http://${input}`);
  if (DOMAIN.test(input)) return asUrl(`https://${input}`);
  return search();
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function titleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'localhost' || /^127\./.test(parsed.hostname)) return parsed.host;
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/** Comparison key that ignores scheme, `www.` and a trailing slash. */
export function urlKey(url: string): string {
  return displayUrl(url)
    .replace(/^www\./, '')
    .toLowerCase();
}

export function isLocalUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname === '[::1]' || /^127\./.test(hostname);
  } catch {
    return false;
  }
}

export function faviconCandidate(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return `${parsed.origin}/favicon.ico`;
  } catch {
    return null;
  }
}
