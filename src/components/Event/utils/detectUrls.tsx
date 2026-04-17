import { Link } from '@linagora/twake-mui'
import React from 'react'

export function detectUrls(text: string): JSX.Element[] {
  // Simple regex that captures whole URLs without splitting them apart
  const urlRegex = /(https?:\/\/[^\s<>]+|www\.[^\s<>]+)/gi

  const parts = []
  let lastIndex = 0

  text.replace(urlRegex, (match, _, offset: number) => {
    // Strip trailing punctuation, but preserve balanced parentheses (e.g. Wikipedia)
    let url = match

    while (/[.,;:!?)]$/.test(url)) {
      if (url.endsWith(')')) {
        const openCount = countChar(url, '(')
        const closeCount = countChar(url, ')')
        if (closeCount <= openCount) break
      }
      url = url.slice(0, -1)
    }

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

function countChar(value: string, char: '(' | ')'): number {
  return (value.match(new RegExp(`\\${char}`, 'g')) || []).length
}
