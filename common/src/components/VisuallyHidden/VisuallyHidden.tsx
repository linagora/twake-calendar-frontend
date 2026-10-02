import { Box } from '@linagora/twake-mui'
import type { ElementType, ReactNode } from 'react'

// Kept in the accessibility tree, removed from the visual rendering
export const visuallyHiddenSx = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: '1px',
  margin: '-1px',
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: '1px'
} as const

export const VisuallyHidden: React.FC<{
  component?: ElementType
  id?: string
  children: ReactNode
  role?: string
  'aria-live'?: 'polite' | 'assertive' | 'off'
  'aria-atomic'?: boolean
}> = ({ component = 'span', children, ...props }) => (
  <Box component={component} sx={visuallyHiddenSx} {...props}>
    {children}
  </Box>
)

export default VisuallyHidden
