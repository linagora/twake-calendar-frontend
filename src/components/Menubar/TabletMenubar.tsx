import { IconButton } from '@linagora/twake-mui'
import MenuIcon from '@mui/icons-material/Menu'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useI18n } from 'twake-i18n'
import SearchBar from './EventSearchBar'
import { MainTitle } from './MainTitle'
import { SharedMenubarProps } from './Menubar'
import { UserMenu } from './UserMenu'
import { SmallNavigationControls } from './components/SmallNavigationControls'

export const TabletMenubar: React.FC<SharedMenubarProps> = ({
  calendarRef,
  currentView,
  isIframe,
  dateLabel,
  onUserMenuOpen,
  onSettingsClick,
  onLogoutClick,
  onNavigate,
  onRefresh,
  onToggleSidebar,
  user,
  userMenuAnchorEl,
  onUserMenuClose,
  onViewChange,
  onDateChange
}: SharedMenubarProps) => {
  const { t } = useI18n()

  return (
    <header className="menubar">
      <div className="left-menu">
        <IconButton
          onClick={onToggleSidebar}
          aria-label={t('menubar.toggleSidebar')}
          title={t('menubar.toggleSidebar')}
        >
          <MenuIcon />
        </IconButton>

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

        <div className="menu-items" style={{ marginLeft: 0 }}>
          <SmallNavigationControls onNavigate={onNavigate} />
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
