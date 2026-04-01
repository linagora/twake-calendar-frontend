import { IconButton, Stack } from '@linagora/twake-mui'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import MenuIcon from '@mui/icons-material/Menu'
import RefreshIcon from '@mui/icons-material/Refresh'
import TodayIcon from '@mui/icons-material/Today'
import { useI18n } from 'twake-i18n'
import SearchBar from './EventSearchBar'
import { MainTitle } from './MainTitle'
import { SharedMenubarProps } from './Menubar'
import { UserMenu } from './UserMenu'

export function TabletMenubar({
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
}: SharedMenubarProps) {
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
          <div className="navigation-controls">
            <Stack direction="row">
              <IconButton
                onClick={() => onNavigate('prev')}
                aria-label={t('menubar.prev')}
                title={t('menubar.prev')}
              >
                <ChevronLeftIcon sx={{ height: 20 }} />
              </IconButton>
              <IconButton
                color="primary"
                sx={{
                  border: '1px solid',
                  borderRadius: '12px'
                }}
                onClick={() => onNavigate('today')}
                aria-label={t('menubar.today')}
                title={t('menubar.today')}
              >
                <TodayIcon />
              </IconButton>
              <IconButton
                onClick={() => onNavigate('next')}
                aria-label={t('menubar.next')}
                title={t('menubar.next')}
              >
                <ChevronRightIcon sx={{ height: 20 }} />
              </IconButton>
            </Stack>
          </div>
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
