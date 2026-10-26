// Upstream to twake-ui: no. twake-mui 13's Avatar always adds a size class
// (`size-m` by default), which outranks the `sx` sizes of the calendar, and
// paints any `color` as a CSS background. This keeps the 5.1.1 behaviour:
// MUI's 40 px when no size is given, and the colour of the name unless
// `color` is one of the twake-mui colours.
import {
  Avatar as TwakeAvatar,
  supportedColors,
  type AvatarProps
} from '@linagora/twake-mui'
import React, { type ReactElement } from 'react'

const MUI_DEFAULT_SIZE = 40

export function Avatar({
  color,
  size = MUI_DEFAULT_SIZE,
  ...props
}: AvatarProps): ReactElement {
  const isTwakeColor =
    color === 'none' || (supportedColors as readonly string[]).includes(color ?? '')
  return (
    <TwakeAvatar
      color={isTwakeColor ? color : undefined}
      size={size}
      {...props}
    />
  )
}
