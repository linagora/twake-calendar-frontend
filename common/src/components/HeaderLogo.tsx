import { styled } from '@linagora/twake-mui'
import Logo from '@common/static/header-logo.svg?react'

// The "Twake" word of the logo is drawn in currentColor: black on the light
// scheme, as before, and white on the dark one
export const HeaderLogo = styled(Logo)(({ theme }) => ({
  color: theme.vars.palette.common.black,
  ...theme.applyStyles('dark', { color: theme.vars.palette.common.white })
}))
