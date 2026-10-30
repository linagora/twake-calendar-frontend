/**
 * @vitest-environment jsdom
 */

import { renderHook } from '@testing-library/react'
import { useEventOrganizer } from '@common/features/Events/useEventOrganizer'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'

describe('useEventOrganizer', () => {
  const defaultUserOrganizer = new userOrganiser({
    cn: 'User Name',
    cal_address: 'mailto:user@example.com'
  })

  const baseCalendar: Calendar = {
    id: 'cal-1',
    link: '/cal-1',
    name: 'Personal Calendar',
    visibility: 'private',
    owner: {
      firstname: 'User',
      lastname: 'Name',
      emails: ['user@example.com']
    },
    events: {
      'event-1': {
        id: 'event-1',
        organizer: new userOrganiser({
          cn: 'User Name',
          cal_address: 'mailto:user@example.com'
        })
      } as CalendarEvent
    }
  }

  it('returns default user organizer when calendar is not delegated', () => {
    const { result } = renderHook(() =>
      useEventOrganizer({
        calendarid: 'cal-1',
        eventId: 'event-1',
        calList: { 'cal-1': baseCalendar },
        userOrganizer: defaultUserOrganizer
      })
    )

    expect(result.current.organizer).toBe(defaultUserOrganizer)
    expect(result.current.selectedCalendar).toEqual(baseCalendar)
    expect(result.current.isOrganizer).toBe(true)
  })

  it('returns delegated organizer for non-team delegated calendar', () => {
    const delegatedCalendar: Calendar = {
      ...baseCalendar,
      id: 'delegated-cal',
      delegated: true,
      owner: {
        firstname: 'Owner',
        lastname: 'Delegated',
        emails: ['owner@example.com']
      }
    }

    const { result } = renderHook(() =>
      useEventOrganizer({
        calendarid: 'delegated-cal',
        eventId: null,
        calList: { 'delegated-cal': delegatedCalendar },
        userOrganizer: defaultUserOrganizer
      })
    )

    expect(result.current.organizer.cn).toBe('Owner Delegated')
    expect(result.current.organizer.cal_address).toBe('owner@example.com')
    expect(result.current.isOrganizer).toBe(false)
  })

  it('returns the current user for team delegated calendar', () => {
    const teamCalendar: Calendar = {
      ...baseCalendar,
      id: 'team-cal',
      delegated: true,
      owner: {
        firstname: 'Team Calendar',
        emails: ['team@example.com'],
        teamCalendar: true
      }
    }

    const { result } = renderHook(() =>
      useEventOrganizer({
        calendarid: 'team-cal',
        eventId: null,
        calList: { 'team-cal': teamCalendar },
        userOrganizer: defaultUserOrganizer
      })
    )

    expect(result.current.organizer).toBe(defaultUserOrganizer)
  })
})
