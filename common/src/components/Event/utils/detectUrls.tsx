import { Link } from '@linagora/twake-mui'
import * as linkify from 'linkifyjs'
import React from 'react'
import { linkifyOptions } from '../../../utils/urlUtils'

type LinkifyToken = {
  type: string
  value: string
  href: string
  start: number
  end: number
}

function isValidToken(token: LinkifyToken): boolean {
  if (token.type !== 'url') return false

  const validateOption = linkifyOptions.validate as
    | Record<string, (value: string) => boolean>
    | undefined
  const validateUrl = validateOption?.url

  if (validateUrl && !validateUrl(token.value)) return false

  return true
}

function normalizeHref(token: LinkifyToken): string {
  const href = token.href
  if (
    token.value.toLowerCase().startsWith('www.') &&
    href.startsWith('http://')
  ) {
    return 'https://' + token.value
  }
  if (!/^https?:\/\//i.test(token.value)) {
    return 'https://' + token.value
  }
  return href
}

export function detectUrls(text: string): JSX.Element[] {
  const parts = []
  let lastIndex = 0

  const tokens = linkify.find(text)

  for (const token of tokens) {
    if (!isValidToken(token)) continue

    // Push the text before the match
    if (lastIndex < token.start) {
      parts.push(
        <React.Fragment key={lastIndex}>
          {text.slice(lastIndex, token.start)}
        </React.Fragment>
      )
    }

    const href = normalizeHref(token)

    parts.push(
      <Link
        key={token.start}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        underline="always"
      >
        {token.value}
      </Link>
    )

    lastIndex = token.end
  }

  // Push remaining text after the last URL
  if (lastIndex < text.length) {
    parts.push(
      <React.Fragment key={lastIndex}>{text.slice(lastIndex)}</React.Fragment>
    )
  }

  return parts
}
