/**
 * @vitest-environment jsdom
 */

import ICAL from 'ical.js'
import {
  buildDefaultNewEvent,
  buildFromExistingEvent
} from '@common/components/Event/utils/eventInitialValuesHelpers'
import { EventFormValues } from '@common/components/Event/EventFormFields.types'
import { updateSeries } from '@common/features/Calendars/CalendarSlice'
import { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import { handleUpdateRecurringSeries } from '@common/features/Events/hooks/submitUpdateHelpers/updateActions'
import { prepareUpdateData } from '@common/features/Events/hooks/submitUpdateHelpers/utils'
import { RecurringUpdateContext } from '@common/features/Events/hooks/submitUpdateHelpers/types'
import { fetchRecurrentSeries } from '@common/features/Events/EventDao'
import { makeSeriesJCal } from '@common/features/Events/transformers/makeSeriesJCal'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'

vi.mock('p-map', () => ({ default: vi.fn() }))
vi.mock('@common/utils/assertThunkSuccess', () => ({
  assertThunkSuccess: vi.fn()
}))
vi.mock('@common/features/Calendars/CalendarSlice', async importOriginal => ({
  ...(await importOriginal<object>()),
  updateSeries: vi.fn(() => ({ type: 'updateSeries' }))
}))
vi.mock('@common/features/Events/EventDao', async importOriginal => ({
  ...(await importOriginal<object>()),
  fetchRecurrentSeries: vi.fn()
}))

// The whole way of a save: the form shows a zone the browser does not know in
// UTC, and writing that zone must not turn the series into a UTC one (#1941).
const TZID = 'Customized Time Zone'
const CAL_ID = 'u1/cal1'

const ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//test//EN',
  'BEGIN:VTIMEZONE',
  `TZID:${TZID}`,
  'BEGIN:STANDARD',
  'DTSTART:19700101T000000',
  'TZOFFSETFROM:-0500',
  'TZOFFSETTO:-0500',
  'END:STANDARD',
  'END:VTIMEZONE',
  'BEGIN:VEVENT',
  'UID:series-1',
  'DTSTAMP:20260101T000000Z',
  `DTSTART;TZID=${TZID}:20261104T090000`,
  `DTEND;TZID=${TZID}:20261104T100000`,
  'RRULE:FREQ=DAILY;COUNT=5',
  `EXDATE;TZID=${TZID}:20261106T090000`,
  'SUMMARY:Sync',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:series-1',
  'DTSTAMP:20260101T000000Z',
  `RECURRENCE-ID;TZID=${TZID}:20261105T090000`,
  `DTSTART;TZID=${TZID}:20261105T110000`,
  `DTEND;TZID=${TZID}:20261105T120000`,
  'SUMMARY:Sync moved',
  'END:VEVENT',
  'END:VCALENDAR'
].join('\r\n')

const organizer = new userOrganiser({
  cn: 'User',
  cal_address: 'user@example.com'
})
const cal = {
  id: CAL_ID,
  name: 'Personal',
  color: {},
  owner: { emails: ['user@example.com'] },
  events: {}
} as unknown as Calendar
const calList = { [CAL_ID]: cal }

const components = (ics: string, name: string): VCalComponent[] =>
  ((ICAL.parse(ics) as VCalComponent)[2] ?? []).filter(([n]) => n === name)

const readMaster = (ics: string): CalendarEvent =>
  parseFetchedEvent(
    {
      uid: 'series-1',
      calId: CAL_ID,
      URL: '/calendars/u1/cal1/series-1.ics'
    } as CalendarEvent,
    ICAL.parse(ics) as VCalComponent,
    true
  )

const formValues = (master: CalendarEvent): EventFormValues =>
  ({
    ...buildDefaultNewEvent({ timezone: 'Europe/Paris', calendarid: CAL_ID }),
    ...buildFromExistingEvent({
      event: master,
      resolvedCalendarTimezone: 'Europe/Paris',
      calList,
      userId: 'u1',
      defaultCalendarId: CAL_ID,
      organizer,
      calId: CAL_ID
    })
  }) as EventFormValues

const savedEvent = (
  master: CalendarEvent,
  values: EventFormValues
): CalendarEvent => {
  const prepared = prepareUpdateData({
    event: master,
    values,
    organizer,
    calList,
    showMore: false,
    calId: CAL_ID,
    eventId: master.uid,
    typeOfAction: 'all',
    masterEvent: master,
    t: (key: string) => key
  })
  if (!prepared) throw new Error('no update data prepared')
  return prepared.newEvent
}

const written = (
  ics: string,
  event: CalendarEvent,
  followTimeChange = false
): ICAL.Component =>
  new ICAL.Component(
    makeSeriesJCal(components(ics, 'vevent'), event, {
      storedVtimezones: components(ics, 'vtimezone'),
      removeOverrides: false,
      followTimeChange
    }) as unknown[]
  )

const masterOf = (calendar: ICAL.Component): ICAL.Component =>
  calendar
    .getAllSubcomponents('vevent')
    .find(vevent => !vevent.hasProperty('recurrence-id')) as ICAL.Component

const overrideOf = (calendar: ICAL.Component): ICAL.Component =>
  calendar
    .getAllSubcomponents('vevent')
    .find(vevent => vevent.hasProperty('recurrence-id')) as ICAL.Component

const dtstart = (vevent: ICAL.Component): [string | undefined, unknown] => {
  const property = vevent.getFirstProperty('dtstart') as ICAL.Property
  return [property.getParameter('tzid') as string, property.toJSON()[3]]
}

describe('saving a series in a custom zone from the form', () => {
  it('shows the zone in UTC', () => {
    const values = formValues(readMaster(ICS))

    expect(values.timezone).toBe('UTC')
    expect(values.start).toBe('2026-11-04T14:00')
  })

  it('keeps the zone, the wall clock and the VTIMEZONE on a rename', () => {
    const master = readMaster(ICS)
    const event = savedEvent(master, {
      ...formValues(master),
      title: 'Renamed'
    })

    const calendar = written(ICS, event)

    expect(dtstart(masterOf(calendar))).toEqual([TZID, '2026-11-04T09:00:00'])
    expect(
      calendar
        .getAllSubcomponents('vtimezone')
        .map(vtimezone => vtimezone.getFirstPropertyValue('tzid'))
    ).toEqual([TZID])
    expect(dtstart(overrideOf(calendar))).toEqual([TZID, '2026-11-05T11:00:00'])
  })

  it('reads a new time in UTC, as the form shows it, and writes it in the zone', () => {
    const master = readMaster(ICS)
    const event = savedEvent(master, {
      ...formValues(master),
      start: '2026-11-04T15:00',
      end: '2026-11-04T16:00'
    })

    const calendar = written(ICS, event, true)

    expect(dtstart(masterOf(calendar))).toEqual([TZID, '2026-11-04T10:00:00'])
    const recurrenceId = overrideOf(calendar).getFirstProperty(
      'recurrence-id'
    ) as ICAL.Property
    expect(recurrenceId.toJSON()[3]).toBe('2026-11-05T10:00:00')
  })

  it('writes a zone the user picked', () => {
    const master = readMaster(ICS)
    const event = savedEvent(master, {
      ...formValues(master),
      timezone: 'Asia/Tokyo',
      start: '2026-11-04T23:00',
      end: '2026-11-05T00:00'
    })

    const [tzid] = dtstart(masterOf(written(ICS, event)))

    expect(tzid).toBe('Asia/Tokyo')
  })

  it('stays in UTC for a TZID no VTIMEZONE of the object defines', () => {
    const withoutVtimezone = ICS.replace(
      /BEGIN:VTIMEZONE[\s\S]*END:VTIMEZONE\r\n/,
      ''
    )
    const master = readMaster(withoutVtimezone)
    const event = savedEvent(master, {
      ...formValues(master),
      title: 'Renamed'
    })

    const [tzid] = dtstart(masterOf(written(withoutVtimezone, event)))

    expect(tzid).toBe('UTC')
  })

  it('keeps the overrides and the EXDATEs of the series on a rename', async () => {
    const master = readMaster(ICS)
    const values = { ...formValues(master), title: 'Renamed' }

    await handleUpdateRecurringSeries({
      dispatch: vi.fn(),
      calId: CAL_ID,
      event: master,
      masterEvent: master,
      values,
      newEvent: savedEvent(master, values),
      baseUID: 'series-1',
      targetCalendar: cal,
      tempContext: {},
      getSeriesInstances: () => ({})
    } as unknown as RecurringUpdateContext)

    expect(updateSeries).toHaveBeenCalledWith(
      expect.objectContaining({ removeOverrides: false })
    )
  })

  describe('a time move of the series', () => {
    const WEEKLY_THURSDAY_LATE = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//test//EN',
      'BEGIN:VTIMEZONE',
      `TZID:${TZID}`,
      'BEGIN:STANDARD',
      'DTSTART:19700101T000000',
      'TZOFFSETFROM:-0500',
      'TZOFFSETTO:-0500',
      'END:STANDARD',
      'END:VTIMEZONE',
      'BEGIN:VEVENT',
      'UID:series-1',
      'DTSTAMP:20260101T000000Z',
      `DTSTART;TZID=${TZID}:20261105T220000`,
      `DTEND;TZID=${TZID}:20261105T230000`,
      'RRULE:FREQ=WEEKLY;BYDAY=TH;COUNT=5',
      `EXDATE;TZID=${TZID}:20261112T220000`,
      'SUMMARY:Sync',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n')

    const storedSeries = (ics: string): void => {
      vi.mocked(fetchRecurrentSeries).mockResolvedValue({
        vevents: components(ics, 'vevent'),
        vtimezones: components(ics, 'vtimezone')
      })
    }

    const saveSeries = async (
      ics: string,
      start: string,
      end: string
    ): Promise<void> => {
      storedSeries(ics)
      const master = readMaster(ics)
      const values = { ...formValues(master), start, end }

      await handleUpdateRecurringSeries({
        dispatch: vi.fn(),
        calId: CAL_ID,
        event: master,
        masterEvent: master,
        values,
        newEvent: savedEvent(master, values),
        baseUID: 'series-1',
        targetCalendar: cal,
        tempContext: {},
        getSeriesInstances: () => ({})
      } as unknown as RecurringUpdateContext)
    }

    it('does not keep the EXDATEs when the new time is on another day of the series zone', async () => {
      // shown 2026-11-06T03:00 UTC; 06:00 UTC is still Friday in UTC, but
      // Friday 01:00 in the zone, where the series is on Thursdays
      await saveSeries(
        WEEKLY_THURSDAY_LATE,
        '2026-11-06T06:00',
        '2026-11-06T07:00'
      )

      expect(updateSeries).toHaveBeenCalledWith(
        expect.objectContaining({ removeOverrides: true })
      )
    })

    it('keeps the overrides and the EXDATEs when the new time crosses midnight UTC only', async () => {
      // 22:00 in the zone (03:00 UTC on Friday) moved to 18:00 in the zone,
      // 23:00 UTC on Thursday: still Thursday in the zone
      await saveSeries(
        WEEKLY_THURSDAY_LATE,
        '2026-11-05T23:00',
        '2026-11-06T00:00'
      )

      expect(updateSeries).toHaveBeenCalledWith(
        expect.objectContaining({
          removeOverrides: false,
          followTimeChange: true
        })
      )
    })

    it('keeps the overrides and the EXDATEs on a move within the day', async () => {
      await saveSeries(ICS, '2026-11-04T15:00', '2026-11-04T16:00')

      expect(updateSeries).toHaveBeenCalledWith(
        expect.objectContaining({
          removeOverrides: false,
          followTimeChange: true
        })
      )
    })

    it('does not read the stored series when the start does not move', async () => {
      await saveSeries(ICS, '2026-11-04T14:00', '2026-11-04T16:00')

      expect(fetchRecurrentSeries).not.toHaveBeenCalled()
    })
  })
})
