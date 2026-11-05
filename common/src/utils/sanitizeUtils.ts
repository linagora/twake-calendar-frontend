import dompurify from 'dompurify'

const DOMPurify =
  typeof window !== 'undefined' && typeof dompurify === 'function'
    ? dompurify(window)
    : dompurify

if (typeof DOMPurify?.addHook === 'function') {
  // Every link of a description opens in a new tab, without access to the
  // calendar window and without leaking its URL.
  DOMPurify.addHook('afterSanitizeAttributes', (node: Element) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer')
    }
  })
}

/**
 * Sanitizes HTML text by only allowing basic styling tags.
 * All CSS styling, attributes, and heading tags are removed.
 *
 * Allowed tags:
 * - Text styling: b, i, u, s, strong, em, strike, del
 * - Lists: ul, ol, li
 * - Other: p, br, a
 */
export function sanitizeHtml(htmlText: string): string {
  if (!htmlText) return ''

  // Allowed tags based on requirements:
  // "basic styling tag (bold, italic, underline, crossed, bullet points and lists)"
  // plus basic layout like p, br, a.
  const allowedTags = [
    'b',
    'i',
    'u',
    's',
    'strong',
    'em',
    'strike',
    'del',
    'ul',
    'ol',
    'li',
    'p',
    'br',
    'a'
  ]

  if (typeof DOMPurify?.sanitize === 'function') {
    return DOMPurify.sanitize(htmlText, {
      ALLOWED_TAGS: allowedTags,
      // target and rel are not taken from the description: its author could
      // otherwise point a link at the embedding portal (target="_top").
      ALLOWED_ATTR: ['href'],
      KEEP_CONTENT: true
    })
  }

  return htmlText
}
