import React, { useEffect, useRef } from 'react'

// Effects that auto-focus the title input must not run in the test environment
// because jsdom has no layout engine and focus() calls produce false positives.
const isNotTestEnv = process.env.NODE_ENV !== 'test'

export const useFocusTitleOnOpen = (
  isOpen: boolean,
  eventId: string | null | undefined,
  titleInputRef: React.RefObject<HTMLInputElement>
): void => {
  useEffect(() => {
    const isNewEventOpen = isOpen && !eventId
    if (!isNewEventOpen || !isNotTestEnv) return
    const timer = setTimeout(() => {
      titleInputRef.current?.focus()
    }, 100)
    return (): void => clearTimeout(timer)
  }, [isOpen, eventId, titleInputRef])
}

function useFocusTitleOnToggle(
  isOpen: boolean,
  showMore: boolean,
  titleInputRef: React.RefObject<HTMLInputElement>
): void {
  const prevShowMoreRef = useRef<boolean | undefined>(undefined)

  useEffect(() => {
    const isFirstRender = prevShowMoreRef.current === undefined
    const hasChanged = prevShowMoreRef.current !== showMore
    prevShowMoreRef.current = showMore

    const shouldFocusOnToggle =
      !isFirstRender && isOpen && isNotTestEnv && hasChanged
    if (!shouldFocusOnToggle) return

    const timer = setTimeout(() => {
      titleInputRef.current?.focus()
    }, 150)
    return (): void => clearTimeout(timer)
  }, [showMore, isOpen, titleInputRef])
}

export const useAutoFocusTitle = ({
  isOpen,
  eventId,
  titleInputRef,
  showMore
}: {
  isOpen: boolean
  eventId?: string | null
  titleInputRef: React.RefObject<HTMLInputElement>
  showMore: boolean
}): void => {
  useFocusTitleOnOpen(isOpen, eventId, titleInputRef)
  useFocusTitleOnToggle(isOpen, showMore, titleInputRef)
}
