import { IconButton } from '@linagora/twake-mui'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useI18n } from 'twake-i18n'
import { AppListMenu } from './AppListMenu'
import SearchBar from './EventSearchBar'
import { MainTitle } from './MainTitle'
import { SharedMenubarProps } from './Menubar'
import { NavigationControls } from './components/NavigationControls'
import { SelectView } from './SelectView'
import { UserMenu } from './UserMenu'

export const DesktopMenubar: React.FC<SharedMenubarProps> = ({
  calendarRef,
  currentView,
  isIframe,
  dateLabel,
  supportLink,
  anchorEl,
  onAppMenuOpen,
  onAppMenuClose,
  onUserMenuOpen,
  onSettingsClick,
  onLogoutClick,
  onNavigate,
  onRefresh,
  onViewChange,
  onDateChange,
  user,
  userMenuAnchorEl,
  onUserMenuClose
}) => {
  const { t } = useI18n()

  return (
    <header className="menubar">
      <div className="left-menu">
        {!isIframe && (
          <div className="menu-items">
            <MainTitle
              calendarRef={calendarRef}
              currentView={currentView}
              onViewChange={onViewChange}
              onDateChange={onDateChange}
            />
          </div>
        )}

        <div className="menu-items" style={{ marginLeft: '65px' }}>
          <NavigationControls onNavigate={onNavigate} />
        </div>

        <div className="menu-items">
          <div className="current-date-time">
            <p>{dateLabel}</p>
          </div>
        </div>
      </div>

      <div className="right-menu">
        <div className="search-container">
          <SearchBar />
        </div>

        <div className="menu-items">
          <IconButton
            className="refresh-button"
            onClick={onRefresh}
            aria-label={t('menubar.refresh')}
            title={t('menubar.refresh')}
            sx={{ mr: 1 }}
          >
            <RefreshIcon />
          </IconButton>
        </div>

        <div className="menu-items">
          <SelectView currentView={currentView} onViewChange={onViewChange} />
        </div>

        {!isIframe && (
          <>
            {supportLink && (
              <div className="menu-items">
                <IconButton
                  component="a"
                  href={supportLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ marginRight: 8 }}
                  aria-label={t('menubar.help')}
                  title={t('menubar.help')}
                >
                  <HelpOutlineIcon />
                </IconButton>
              </div>
            )}

            <div className="menu-items">
              <AppListMenu
                anchorEl={anchorEl}
                onAppMenuOpen={onAppMenuOpen}
                onAppMenuClose={onAppMenuClose}
              />
            </div>
          </>
        )}

        <div className="menu-items">
          <UserMenu
            anchorEl={userMenuAnchorEl}
            onClose={onUserMenuClose}
            onSettingsClick={onSettingsClick}
            onLogoutClick={onLogoutClick}
            onUserMenuOpen={onUserMenuOpen}
            isIframe={isIframe}
            user={user}
          />
        </div>
      </div>
    </header>
  )
}
