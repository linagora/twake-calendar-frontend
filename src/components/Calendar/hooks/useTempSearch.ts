import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { removeTempCal } from '@/features/Calendars/CalendarSlice'
import { getTempCalendarsListAsync } from '@/features/Calendars/services'
import { setView } from '@/features/Settings/SettingsSlice'
import { defaultColors } from '@/utils/defaultColors'
import { useEffect, useRef } from 'react'
import {
  buildEmailToCalendarMap,
  generateDistinctColor
} from '../utils/tempSearchUtil'
import { User } from '../../Attendees/types'

const requestControllers = new Map<string, AbortController>()

export const useTempSearch = ({
  setTempUsers,
  tempUsers
}: {
  setTempUsers: (users: User[]) => void
  tempUsers?: User[]
}): {
  handleUserChange: (event: React.SyntheticEvent, users: User[]) => void
} => {
  const dispatch = useAppDispatch()
  const tempcalendars = useAppSelector(state => state.calendars.templist) ?? {}

  const prevUsersRef = useRef<User[]>([])
  const userColorsRef = useRef(
    new Map<string, { light: string; dark: string }>()
  )

  useEffect(() => {
    prevUsersRef.current = tempUsers || []

    for (const user of tempUsers || []) {
      if (!userColorsRef.current.has(user.email)) {
        const usedLights = Array.from(userColorsRef.current.values()).map(
          c => c.light
        )
        const colorPair = generateDistinctColor(usedLights)
        userColorsRef.current.set(user.email, colorPair)
      }
    }
  }, [tempUsers])

  const addTempEvent = (user: User): void => {
    const controller = new AbortController()
    requestControllers.set(user.email, controller)

    if (!userColorsRef.current.has(user.email)) {
      const usedLights = Array.from(userColorsRef.current.values()).map(
        c => c.light
      )
      const colorPair = generateDistinctColor(usedLights)
      userColorsRef.current.set(user.email, colorPair)
    }

    user.color = userColorsRef.current.get(user.email) ?? defaultColors[0]
    void dispatch(
      getTempCalendarsListAsync(user, { signal: controller.signal })
    )
  }

  const removeTempEvent = (user: User): void => {
    const controller = requestControllers.get(user.email)
    if (controller) {
      controller.abort()
      requestControllers.delete(user.email)
    }

    const calIds = buildEmailToCalendarMap(tempcalendars).get(user.email)
    calIds?.forEach(id => dispatch(removeTempCal(id)))
    userColorsRef.current.delete(user.email)
  }

  const handleUserChange = (_: React.SyntheticEvent, users: User[]): void => {
    setTempUsers(users)

    const prevUsers = prevUsersRef.current

    const addedUsers =
      users.filter(u => !prevUsers.some(p => p.email === u.email)) ?? []
    const removedUsers =
      prevUsers.filter(p => !users.some(u => u.email === p.email)) ?? []

    prevUsersRef.current = users

    dispatch(setView('calendar'))

    for (const user of addedUsers) {
      addTempEvent(user)
    }

    for (const user of removedUsers) {
      removeTempEvent(user)
    }
  }

  return { handleUserChange }
}
