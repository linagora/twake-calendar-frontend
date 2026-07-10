import React from 'react'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { BookingLinkDesktopMenu } from './BookingLinkDesktopMenu'
import { BookingLinkMobileMenu } from './BookingLinkMobileMenu'

interface BookingLinkSelectorMenuProps {
  anchorEl: HTMLElement | null
  open: boolean
  onClose: () => void
  onDelete: () => void
  onEdit: () => void
}

export const BookingLinkSelectorMenu: React.FC<
  BookingLinkSelectorMenuProps
> = ({ anchorEl, open, onClose, onDelete, onEdit }) => {
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  if (!isMobile) {
    return (
      <BookingLinkDesktopMenu
        anchorEl={anchorEl}
        open={open}
        onClose={onClose}
        onDelete={onDelete}
        onEdit={onEdit}
      />
    )
  }

  return (
    <BookingLinkMobileMenu
      open={open}
      onClose={onClose}
      onDelete={onDelete}
      onEdit={onEdit}
    />
  )
}
