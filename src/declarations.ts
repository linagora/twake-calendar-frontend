declare module '*.styl'

declare module '@linagora/twake-mui' {
  export * from '@mui/material'

  export function useTheme<T = import('@mui/material').Theme>(): T

  export type AvatarSize = 'xs' | 's' | 'm' | 'l' | 'xl'
  export type AvatarDisplay = 'initial' | 'inline'

  export interface AvatarProps extends Omit<
    import('@mui/material').AvatarProps,
    'color'
  > {
    color?: string
    size?: AvatarSize | number
    border?: boolean
    innerBorder?: boolean
    disabled?: boolean
    display?: AvatarDisplay
  }

  export const Avatar: import('react').FC<AvatarProps>

  export const radius: Record<string, string | number>
}
