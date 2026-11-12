import { isLocalUrl } from '../utils/url';
import type { EmbedSupport } from './types';

/**
 * Sites known to send `X-Frame-Options` or a restrictive CSP `frame-ancestors`
 * for their main pages. This list only skips a pointless attempt; it is not a
 * guarantee in either direction. Sites not listed are attempted, and may still
 * refuse — the UI says so and always offers "Open in browser".
 */
const KNOWN_BLOCKING_DOMAINS = [
  'google.com',
  'youtube.com',
  'duckduckgo.com',
  'bing.com',
  'github.com',
  'gitlab.com',
  'spotify.com',
  'atlassian.com',
  'atlassian.net',
  'dev.azure.com',
  'visualstudio.com',
  'microsoft.com',
  'live.com',
  'office.com',
  'facebook.com',
  'instagram.com',
  'x.com',
  'twitter.com',
  'linkedin.com',
  'reddit.com',
  'amazon.com',
  'netflix.com',
  'stackoverflow.com',
  'notion.so',
  'slack.com',
  'figma.com',
  'openai.com',
  'claude.ai',
];

function matchesDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function getIframeEmbedSupport(url: string): EmbedSupport {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return { mode: 'blocked', reason: 'This address could not be parsed.' };
  }
  if (isLocalUrl(url)) return { mode: 'iframe', local: true };
  const blocked = KNOWN_BLOCKING_DOMAINS.find((d) => matchesDomain(hostname, d));
  if (blocked) {
    return {
      mode: 'blocked',
      reason: `${blocked} tells browsers not to display it inside other pages (X-Frame-Options / CSP frame-ancestors).`,
    };
  }
  return { mode: 'iframe', local: false };
}
