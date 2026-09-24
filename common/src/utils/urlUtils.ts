import { Opts } from 'linkifyjs'

export const SAFE_BARE_TLDS = new Set([
  // --- 1. Top GTLDs ---
  'com',
  'org',
  'net',
  'edu',
  'gov',
  'mil',
  'int',
  'biz',
  'info',

  // --- 2. Tech, Modern & Developer TLDs ---
  'io',
  'dev',
  'app',
  'ai',
  'xyz',
  'tech',
  'cloud',
  'online',
  'site',
  'software',
  'digital',
  'agency',
  'security',
  'systems',
  'network',
  'global',
  'live',
  'page',
  'tools',

  // --- 3. ccTLDs ---
  'fr',
  'eu',
  'uk',
  'nl',
  'es',
  'ch',
  'se',
  'no',
  'fi',
  'dk',
  'pl',
  'cz',
  'ca',
  'vn',
  'jp',
  'kr',
  'cn',
  'tw',
  'sg',
  'au',
  'nz',
  'br',
  'mx',
  'co'
])

export const linkifyOptions: Opts = {
  defaultProtocol: 'https',
  target: '_blank',
  rel: 'noopener noreferrer',

  validate: {
    url: (value: string) => {
      // Rule 1: Link with schema (http/https) or www prefix -> Always safe
      if (/^(https?:\/\/|www\.)/i.test(value)) {
        return true
      }

      // Rule 2: Bare domain processing (string without http/https or www)
      try {
        const parsed = new URL('https://' + value)
        const hostname = parsed.hostname
        const hostParts = hostname.split('.')

        if (hostParts.length < 2) return false

        const tld = hostParts[hostParts.length - 1].toLowerCase()
        const hasPathOrQuery = parsed.pathname !== '/' || Boolean(parsed.search)
        const hasSubdomain = hostParts.length > 2

        // If have /path, ?query or subdomain (e.g., positive.it/foo, api.positive.it)
        // -> Clearly a URL, accept any TLD
        if (hasPathOrQuery || hasSubdomain) {
          return true
        }

        // If it's a bare domain (just domain.tld):
        // Only accept if TLD is in SAFE_BARE_TLDS
        return SAFE_BARE_TLDS.has(tld)
      } catch {
        return false
      }
    }
  }
}
