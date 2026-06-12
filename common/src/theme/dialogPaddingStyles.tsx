import type { SxProps } from '@linagora/twake-mui'

export const dialogPaddingStyles = (isMobile: boolean): SxProps => ({
  '& .MuiDialogActions-root': {
    paddingLeft: isMobile ? 2 : 4,
    paddingRight: isMobile ? 2 : 4
  }
})
