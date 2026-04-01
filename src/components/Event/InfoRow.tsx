import {
  Box,
  Link,
  Typography,
  useTheme,
  useMediaQuery
} from '@linagora/twake-mui'
import React from 'react'

type InfoRowProps = {
  icon: React.ReactNode
  text?: string
  error?: boolean
  data?: string // optional link target
  content?: React.ReactNode // if provided, overrides text rendering
  style?: React.CSSProperties
  alignItems?: React.CSSProperties['alignItems']
  flexWrap?: React.CSSProperties['flexWrap']
}

function detectUrls(text: string): JSX.Element[] {
  // Simple regex that captures whole URLs without splitting them apart
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi

  const parts = []
  let lastIndex = 0

  text.replace(urlRegex, (match, _, offset: number) => {
    // Push the text before the match
    if (lastIndex < offset) {
      parts.push(
        <React.Fragment key={lastIndex}>
          {text.slice(lastIndex, offset)}
        </React.Fragment>
      )
    }

    // Normalize href
    const href = match.startsWith('http') ? match : `https://${match}`
    parts.push(
      <Link
        key={offset}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        underline="always"
      >
        {match}
      </Link>
    )

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

export function InfoRow({
  icon,
  text,
  error = false,
  data,
  content,
  style,
  alignItems = 'center',
  flexWrap = 'nowrap'
}: InfoRowProps): JSX.Element {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  return (
    <Box
      style={{
        display: 'flex',
        alignItems,
        gap: 1,
        marginBottom: 1,
        flexWrap
      }}
    >
      {icon}
      {content ? (
        content
      ) : (
        <Typography
          variant="body2"
          color={error ? 'error' : 'textPrimary'}
          sx={{
            wordBreak: 'break-word',
            whiteSpace: 'pre-line',
            maxHeight: isMobile ? undefined : '33vh',
            overflowY: isMobile ? undefined : 'auto',
            width: '100%',
            ...style
          }}
        >
          {data ? (
            <Link
              href={data}
              target="_blank"
              rel="noopener noreferrer"
              underline="always"
            >
              {text}
            </Link>
          ) : text ? (
            detectUrls(text)
          ) : null}
        </Typography>
      )}
    </Box>
  )
}
