import React, { useEffect } from 'react'

export const useEventLocation = ({
  isOpen,
  hasClickedLocationSection,
  setHasClickedLocationSection,
  locationInputRef
}: {
  isOpen: boolean
  hasClickedLocationSection: boolean
  setHasClickedLocationSection: (hasClicked: boolean) => void
  locationInputRef: React.RefObject<HTMLInputElement | null>
}): void => {
  // Reset location click state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHasClickedLocationSection(false)
    }
  }, [isOpen, setHasClickedLocationSection])

  // Focus location field when user clicks the location preview row
  useEffect(() => {
    if (hasClickedLocationSection && process.env.NODE_ENV !== 'test') {
      locationInputRef.current?.focus()
    }
  }, [hasClickedLocationSection, locationInputRef])
}
