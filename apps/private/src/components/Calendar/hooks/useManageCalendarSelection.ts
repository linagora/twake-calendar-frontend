import { useState, useMemo, useRef, useEffect } from 'react'
import { useAppSelector } from '@common/app/hooks'
import { useSelectedCalendars } from '@common/utils/storage/useSelectedCalendars'
import { setSelectedCalendars as setSelectedCalendarsToStorage } from '@common/utils/storage/setSelectedCalendars'
import { extractEventBaseUuid } from '@common/utils/extractEventBaseUuid'
import { User } from '@common/components/Attendees/types'

export const useManageCalendarSelection = (): {
  selectedCalendars: string[]
  setSelectedCalendars: React.Dispatch<React.SetStateAction<string[]>>
  tempUsers: User[]
  setTempUsers: React.Dispatch<React.SetStateAction<User[]>>
  selectedMiniDate: Date | null
  setSelectedMiniDate: React.Dispatch<React.SetStateAction<Date | null>>
} => {
  const calendars = useAppSelector(state => state.calendars.list)
  const userId = useAppSelector(state => state.user.userData?.openpaasId) ?? ''

  const storedCalendars = useSelectedCalendars()
  const [selectedCalendars, setSelectedCalendars] =
    useState<string[]>(storedCalendars)
  const [tempUsers, setTempUsers] = useState<User[]>([])
  const [selectedMiniDate, setSelectedMiniDate] = useState<Date | null>(null)

  const calendarIdsString = useMemo(
    () =>
      Object.keys(calendars || {})
        .sort()
        .join(','),
    [calendars]
  )
  const calendarIds = useMemo(
    () => (calendarIdsString ? calendarIdsString.split(',') : []),
    [calendarIdsString]
  )

  const initialLoadRef = useRef(true)

  useEffect(() => {
    const updateSelectedCalendars = (): void => {
      const isValid = initialLoadRef.current && calendarIds.length > 0 && userId
      if (isValid) {
        const cached = localStorage.getItem('selectedCalendars')
        if (cached && cached.length > 0) {
          try {
            const parsed = JSON.parse(cached) as string[]
            const valid = parsed.filter(id => calendars[id])
            setSelectedCalendars(valid)
          } catch {
            setSelectedCalendars([])
          }
        } else {
          const personalCalendarIds = calendarIds.filter(
            id => extractEventBaseUuid(id) === userId
          )
          setSelectedCalendars(personalCalendarIds)
        }
        initialLoadRef.current = false
      }
    }
    updateSelectedCalendars()
  }, [calendarIds, calendars, userId])

  useEffect(() => {
    if (calendarIds.length > 0) {
      setSelectedCalendarsToStorage(selectedCalendars)
    }
  }, [selectedCalendars, calendarIds.length])

  useEffect(() => {
    const updateSelectedCalendarsOnCalendarChange = (): void => {
      if (calendarIds.length === 0) return
      const validCalendarIds = new Set(calendarIds)
      setSelectedCalendars(prev => {
        const filtered = prev.filter(calId => validCalendarIds.has(calId))
        if (filtered.length === prev.length) {
          const unchanged = filtered.every((id, index) => id === prev[index])
          if (unchanged) {
            return prev
          }
        }
        return filtered
      })
    }
    updateSelectedCalendarsOnCalendarChange()
  }, [calendarIds])

  return {
    selectedCalendars,
    setSelectedCalendars,
    tempUsers,
    setTempUsers,
    selectedMiniDate,
    setSelectedMiniDate
  }
}
