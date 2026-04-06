declare module '@linagora/twake-mui' {
  export * from '@mui/material'
  import type { AvatarProps as MuiAvatarProps } from '@mui/material'

  export type AvatarSize = 'xs' | 's' | 'm' | 'l' | 'xl'
  export type AvatarDisplay = 'initial' | 'inline'

  export interface AvatarProps extends Omit<MuiAvatarProps, 'color'> {
    color?: string
    size?: AvatarSize | number
    border?: boolean
    innerBorder?: boolean
    disabled?: boolean
    display?: AvatarDisplay
  }

  export const Avatar: React.FC<AvatarProps>

  export const radius: Record<string, string | number>
}
