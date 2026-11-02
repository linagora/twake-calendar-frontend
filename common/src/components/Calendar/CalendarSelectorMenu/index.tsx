import React from 'react'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { CalendarSelectorDesktopMenu } from './CalendarSelectorDesktopMenu'
import { CalendarSelectorMobileMenu } from './CalendarSelectorMobileMenu'

interface CalendarSelectorMenuProps {
  id: string
  anchorEl: HTMLElement | null
  open: boolean
  onClose: () => void
  onModify: () => void
  onShare?: () => void
  onDelete: () => void
  onToggleVisibility?: () => void
  onPrint?: () => void
  isDefault: boolean
  isPersonal: boolean
  isVisible?: boolean
  isTeam?: boolean
}

export const CalendarSelectorMenu: React.FC<CalendarSelectorMenuProps> = ({
  id,
  anchorEl,
  open,
  onClose,
  onModify,
  onShare,
  onDelete,
  onToggleVisibility,
  onPrint,
  isDefault,
  isPersonal,
  isVisible,
  isTeam
}) => {
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  if (!isMobile) {
    return (
      <CalendarSelectorDesktopMenu
        id={id}
        anchorEl={anchorEl}
        open={open}
        onClose={onClose}
        onModify={onModify}
        onShare={onShare}
        onDelete={onDelete}
        onToggleVisibility={onToggleVisibility}
        onPrint={onPrint}
        isDefault={isDefault}
        isPersonal={isPersonal}
        isVisible={isVisible}
        isTeam={isTeam}
      />
    )
  }

  return (
    <CalendarSelectorMobileMenu
      open={open}
      onClose={onClose}
      onModify={onModify}
      onShare={onShare}
      onDelete={onDelete}
      onToggleVisibility={onToggleVisibility}
      onPrint={onPrint}
      isDefault={isDefault}
      isPersonal={isPersonal}
      isVisible={isVisible}
      isTeam={isTeam}
    />
  )
}
