import { Box, radius, Typography, useTheme } from '@linagora/twake-mui'
import React from 'react'

export interface SectionPreviewRowProps {
  icon: React.ReactNode
  /** Primary text or custom content. If string, rendered with fontSize 14px, fontWeight 500. */
  children: React.ReactNode
  onClick: () => void
  iconColor?: string
  /** Accessible name of the row, when its text content does not read well. */
  ariaLabel?: string
}

/**
 * Reusable preview row for event modal sections (normal mode).
 * Layout: icon left (max 32x32), content right. No button.
 */
export const SectionPreviewRow: React.FC<SectionPreviewRowProps> = ({
  icon,
  children,
  onClick,
  iconColor,
  ariaLabel
}) => {
  const theme = useTheme()
  const color = iconColor ?? theme.vars.palette.text.primary

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      sx={{
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        padding: '8px 0px',
        borderRadius: radius.sm,
        '&:hover': {
          backgroundColor: 'action.hover'
        }
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          marginRight: '12px',
          flexShrink: 0,
          color,
          '& svg': {
            maxWidth: '24px',
            maxHeight: '24px'
          },
          '& img': {
            maxWidth: '24px',
            maxHeight: '24px'
          }
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {typeof children === 'string' ? (
          <Typography
            sx={{
              fontSize: '14px',
              fontWeight: 500,
              color
            }}
          >
            {children}
          </Typography>
        ) : (
          children
        )}
      </Box>
    </Box>
  )
}
