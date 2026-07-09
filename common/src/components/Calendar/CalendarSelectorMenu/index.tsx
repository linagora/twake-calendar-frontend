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
  onDelete: () => void
  onToggleVisibility?: () => void
  isDefault: boolean
  isPersonal: boolean
  isVisible?: boolean
}

export const CalendarSelectorMenu: React.FC<CalendarSelectorMenuProps> = ({
  id,
  anchorEl,
  open,
  onClose,
  onModify,
  onDelete,
  onToggleVisibility,
  isDefault,
  isPersonal,
  isVisible
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
        onDelete={onDelete}
        onToggleVisibility={onToggleVisibility}
        isDefault={isDefault}
        isPersonal={isPersonal}
        isVisible={isVisible}
      />
    )
  }

  return (
    <CalendarSelectorMobileMenu
      open={open}
      onClose={onClose}
      onModify={onModify}
      onDelete={onDelete}
      onToggleVisibility={onToggleVisibility}
      isDefault={isDefault}
      isPersonal={isPersonal}
      isVisible={isVisible}
    />
  )
}
