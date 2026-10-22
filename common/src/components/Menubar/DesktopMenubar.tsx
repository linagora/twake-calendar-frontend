import Tooltip from '@common/components/Tooltip'
import { IconButton, useTheme } from '@linagora/twake-mui'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useState } from 'react'
import { useI18n } from 'twake-i18n'
import { NavigationControls } from './components/NavigationControls'
import SearchBar from './EventSearchBar'
import { SharedMenubarProps } from './Menubar'
import { SelectView } from './SelectView'
import { SettingsButton } from './SettingsButton'

export const DesktopMenubar: React.FC<SharedMenubarProps> = ({
  currentView,
  dateLabel,
  onNavigate,
  onRefresh,
  onViewChange
}) => {
  const { t } = useI18n()
  const theme = useTheme()

  const [isSearchExpanded, setIsSearchExpanded] = useState(false)

  return (
    <header
      className="menubar"
      style={{ borderBottom: `1px solid ${theme.vars.palette.divider}` }}
    >
      <div className="left-menu">
        <div className="menu-items" style={{ marginLeft: '65px' }}>
          <NavigationControls
            currentView={currentView}
            onNavigate={onNavigate}
          />
        </div>

        {!isSearchExpanded && (
          <div className="menu-items">
            <div className="current-date-time">
              <p>{dateLabel}</p>
            </div>
          </div>
        )}
      </div>

      <div className="right-menu">
        <div
          className="search-container"
          style={{
            minWidth: 0
          }}
        >
          <SearchBar onToggleSearch={setIsSearchExpanded} />
        </div>

        <div className="menu-items">
          <ResfreshButton t={t} onRefresh={onRefresh} />
        </div>

        <div className="menu-items">
          <SelectView currentView={currentView} onViewChange={onViewChange} />
        </div>

        <div className="menu-items">
          <SettingsButton size="xsmall" />
        </div>
      </div>
    </header>
  )
}

const ResfreshButton: React.FC<{
  t: (key: string, options?: Record<string, any>) => string
  onRefresh: () => void
}> = ({ t, onRefresh }) => {
  if (!window.ENABLE_REFRESH_BUTTON) return null
  return (
    <Tooltip title={t('tooltip.refreshCalendar')}>
      <IconButton
        size="xsmall"
        className="refresh-button"
        onClick={onRefresh}
        aria-label={t('menubar.refresh')}
        sx={{ mr: 1 }}
      >
        <RefreshIcon />
      </IconButton>
    </Tooltip>
  )
}
