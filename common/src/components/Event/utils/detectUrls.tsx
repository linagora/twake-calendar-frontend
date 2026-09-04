import { Link } from '@linagora/twake-mui'
import React from 'react'

export function detectUrls(text: string): JSX.Element[] {
  // Simple regex that captures whole URLs without splitting them apart
  const urlRegex = /(https?:\/\/[^\s<>]+|www\.[^\s<>]+)/gi

  const parts = []
  let lastIndex = 0

  text.replace(urlRegex, (match, _, offset: number) => {
    // Strip trailing punctuation, but preserve balanced parentheses (e.g. Wikipedia)
    const url = trimTrailingPunctuation(match)

    const trailing = match.slice(url.length)

    // Push the text before the match
    if (lastIndex < offset) {
      parts.push(
        <React.Fragment key={lastIndex}>
          {text.slice(lastIndex, offset)}
        </React.Fragment>
      )
    }

    // Normalize href
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`

    parts.push(
      <Link
        key={offset}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        underline="always"
      >
        {url}
      </Link>
    )

    if (trailing) {
      parts.push(
        <React.Fragment key={`${offset}-trailing`}>{trailing}</React.Fragment>
      )
    }

    lastIndex = offset + match.length
    return match
  })

  // Push remaining text after last URL
  if (lastIndex < text.length) {
    parts.push(
      <React.Fragment key={lastIndex}>{text.slice(lastIndex)}</React.Fragment>
    )
  }

  return parts
}

const TRAILING_PUNCTUATION = new Set(['.', ',', ';', ':', '!', '?', ')'])

/**
 * Drops the punctuation a URL picked up from the surrounding sentence, keeping
 * a closing parenthesis that balances an opening one inside the URL.
 *
 * Counts the parentheses once and updates them as characters are dropped: the
 * previous version re-counted (and recompiled a RegExp) on every iteration,
 * which is quadratic in the length of the match, and `location` reaches here
 * straight from the event.
 */
function trimTrailingPunctuation(match: string): string {
  let openCount = 0
  let closeCount = 0
  for (const char of match) {
    if (char === '(') openCount++
    else if (char === ')') closeCount++
  }

  let end = match.length
  while (end > 0 && TRAILING_PUNCTUATION.has(match[end - 1])) {
    if (match[end - 1] === ')') {
      // A closing parenthesis that matches an opening one belongs to the URL.
      if (closeCount <= openCount) break
      closeCount--
    }
    end--
  }

  return end === match.length ? match : match.slice(0, end)
}
