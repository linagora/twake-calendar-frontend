import { useColorScheme } from '@linagora/twake-mui'
import { useEffect } from 'react'
import { useAppSelector } from '@common/app/hooks'

// Applies the core.theme user setting, which Twake Workplace common settings
// also write: `auto`, or no preference, follows the system
export function ColorSchemeSync(): null {
  const theme = useAppSelector(state => state.user.coreConfig.theme)
  const { setMode } = useColorScheme()

  useEffect(() => {
    // Not loaded yet, or a backend without the setting: keep the current mode
    if (theme === undefined) return
    setMode(theme === 'light' || theme === 'dark' ? theme : 'system')
  }, [theme, setMode])

  return null
}
