import React from 'react'
import { Tooltip as MuiTooltip } from '@linagora/twake-mui'

const TOOLTIP_DELAY_MS = 2000

type MuiTooltipProps = React.ComponentProps<typeof MuiTooltip>

export interface TooltipProps extends Omit<MuiTooltipProps, 'title'> {
  title: React.ReactNode
  children: React.ReactElement
}

export const Tooltip: React.FC<TooltipProps> = ({
  title,
  children,
  ...props
}) => {
  return (
    <MuiTooltip
      title={title}
      enterDelay={TOOLTIP_DELAY_MS}
      enterNextDelay={TOOLTIP_DELAY_MS}
      placement="top"
      {...props}
    >
      {children}
    </MuiTooltip>
  )
}

export default Tooltip
