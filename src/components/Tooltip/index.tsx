import React from 'react'
import { Tooltip as MuiTooltip } from '@linagora/twake-mui'

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
      enterDelay={window.TOOLTIP_DELAY_MS}
      enterNextDelay={window.TOOLTIP_DELAY_MS}
      placement="top"
      {...props}
    >
      {children}
    </MuiTooltip>
  )
}

export default Tooltip
