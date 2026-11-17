import {
  canHoldUserEvents,
  withoutOtherResourceCalendars
} from '@common/features/Calendars/utils/calendarPermissions'
import { Calendar } from '@common/types/CalendarTypes'

const personal = {
  id: 'alice/alice',
  name: '#default',
  owner: { emails: ['alice@test.com'] }
} as unknown as Calendar

const team = {
  id: 'team1/team1',
  name: 'Team A',
  delegated: true,
  access: { write: true },
  owner: { emails: [], teamCalendar: true }
} as unknown as Calendar

const readOnlyShared = {
  id: 'bob/bob',
  name: 'Bob',
  delegated: true,
  access: { write: false },
  owner: { emails: ['bob@test.com'] }
} as unknown as Calendar

const roomA = {
  id: 'roomA/roomA',
  name: 'Room A',
  delegated: true,
  access: { write: true },
  owner: { emails: ['roomA@test.com'], resource: true }
} as unknown as Calendar

const roomB = {
  ...roomA,
  id: 'roomB/roomB',
  name: 'Room B'
} as unknown as Calendar

describe('canHoldUserEvents', () => {
  it('accepts the own calendars of the user', () => {
    expect(canHoldUserEvents(personal, 'alice')).toBe(true)
  })

  it('accepts a calendar delegated with the right to write', () => {
    expect(canHoldUserEvents(team, 'alice')).toBe(true)
  })

  it('refuses a calendar delegated read only', () => {
    expect(canHoldUserEvents(readOnlyShared, 'alice')).toBe(false)
  })

  it('refuses the calendar of a resource the user administers', () => {
    expect(canHoldUserEvents(roomA, 'alice')).toBe(false)
  })
})

describe('withoutOtherResourceCalendars', () => {
  it('drops the resource calendars', () => {
    expect(
      withoutOtherResourceCalendars([personal, roomA, team], personal.id)
    ).toEqual([personal, team])
  })

  it('keeps the resource calendar the event already is in', () => {
    expect(
      withoutOtherResourceCalendars([personal, roomA, roomB, team], roomA.id)
    ).toEqual([personal, roomA, team])
  })
})
