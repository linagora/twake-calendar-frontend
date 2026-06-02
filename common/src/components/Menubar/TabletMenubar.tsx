import { useAppDispatch } from '@common/app/hooks'
import Tooltip from '@common/components/Tooltip'
import { clearSearch } from '@common/features/Search/SearchSlice'
import { setView } from '@common/features/Settings/SettingsSlice'
import { IconButton } from '@linagora/twake-mui'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import MenuIcon from '@mui/icons-material/Menu'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import { useState } from 'react'
import { useI18n } from 'twake-i18n'
import { SmallNavigationControls } from './components/SmallNavigationControls'
import { MainTitle } from './MainTitle'
import { SharedMenubarProps } from './Menubar'
import MobileSearchBar from './MobileEventSearchBar'
import { UserMenu } from './UserMenu'

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
  const dispatch = useAppDispatch()

  const [openEventSearch, setOpenEventSearch] = useState(false)
  const handleBackClick = (event: React.MouseEvent): void => {
    event.stopPropagation()
    event.preventDefault()
    dispatch(setView('calendar'))
    dispatch(clearSearch())
  }
  if (openEventSearch) {
    return (
      <header className="menubar menubar--mobile">
        <IconButton
          onClick={e => {
            setOpenEventSearch(false)
            handleBackClick(e)
          }}
          aria-label={t('common.back')}
          sx={{ mr: 1 }}
        >
          <ArrowBackIcon fontSize="inherit" color="inherit" />
        </IconButton>
        <MobileSearchBar />
      </header>
    )
  }

  return (
    <header className="menubar">
      <div className="left-menu">
        <Tooltip title={t('menubar.toggleSidebar')}>
          <IconButton
            onClick={onToggleSidebar}
            aria-label={t('menubar.toggleSidebar')}
          >
            <MenuIcon />
          </IconButton>
        </Tooltip>

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
          <IconButton
            sx={{ mr: 1 }}
            onClick={() => {
              dispatch(setView('search'))
              setOpenEventSearch(true)
            }}
            aria-label={t('common.search')}
          >
            <SearchIcon />
          </IconButton>
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
