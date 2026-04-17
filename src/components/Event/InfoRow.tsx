import {
  Box,
  Link,
  Typography,
  useTheme,
  useMediaQuery
} from '@linagora/twake-mui'
import React from 'react'
import { detectUrls } from './utils/detectUrls'

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
      sx={{
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
            maxHeight: isMobile ? 'none' : '33vh',
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
