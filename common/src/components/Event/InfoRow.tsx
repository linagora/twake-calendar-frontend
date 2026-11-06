import {
  Box,
  Link,
  Typography,
  useTheme,
  useMediaQuery
} from '@linagora/twake-mui'
import React from 'react'
import parse from 'html-react-parser'
import { detectUrls } from './utils/detectUrls'

type InfoRowProps = {
  icon: React.ReactNode
  text?: string
  html?: string
  error?: boolean
  data?: string // optional link target
  content?: React.ReactNode // if provided, overrides text rendering
  style?: React.CSSProperties
  alignItems?: React.CSSProperties['alignItems']
  flexWrap?: React.CSSProperties['flexWrap']
}

const renderContent = (
  html?: string,
  data?: string,
  text?: string
): React.ReactNode => {
  if (html) {
    return <>{parse(html)}</>
  }
  if (data) {
    return (
      <Link
        href={data}
        target="_blank"
        rel="noopener noreferrer"
        underline="always"
      >
        {text}
      </Link>
    )
  }
  if (text) {
    return detectUrls(text)
  }
  return null
}

export function InfoRow({
  icon,
  text,
  html,
  error = false,
  data,
  content,
  style,
  alignItems = 'center',
  flexWrap = 'nowrap'
}: InfoRowProps): React.JSX.Element {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems,
        marginBottom: 1,
        flexWrap,
        wordBreak: 'break-word'
      }}
    >
      {icon}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {(text || html) && (
          <Typography
            variant="body2"
            color={error ? 'error' : 'textPrimary'}
            sx={{
              whiteSpace: 'pre-line',
              maxHeight: isMobile ? 'none' : '33vh',
              overflowY: isMobile ? undefined : 'auto',
              width: '100%',
              overflowWrap: 'break-word',
              '& ul': {
                paddingLeft: 3,
                listStyleType: 'disc',
                margin: 0
              },
              '& ol': {
                paddingLeft: 3,
                listStyleType: 'decimal',
                margin: 0
              },
              '& li': {
                display: 'list-item'
              },
              ...style
            }}
          >
            {renderContent(html, data, text)}
          </Typography>
        )}
        {content}
      </Box>
    </Box>
  )
}
