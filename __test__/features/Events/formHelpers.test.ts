import { populateFormFromEvent } from '@common/features/Events/formHelpers'
import { CalendarEvent } from '@common/types/EventsTypes'
import { RepetitionObject } from '@common/types/Repetition'

describe('populateFormFromEvent', () => {
  it('correctly sets repetition data with wkst included', () => {
    const mockSetRepetition = jest.fn()
    const mockSetShowRepeat = jest.fn()

    const event = {
      uid: 'event-id',
      title: 'Test Event',
      start: '2026-06-24T10:00:00Z',
      end: '2026-06-24T11:00:00Z',
      timezone: 'Europe/Paris',
      repetition: {
        freq: 'WEEKLY',
        interval: 1,
        byday: ['MO'],
        wkst: 'SU'
      }
    } as unknown as CalendarEvent

    const params = {
      event,
      setTitle: jest.fn(),
      setDescription: jest.fn(),
      setLocation: jest.fn(),
      setStart: jest.fn(),
      setEnd: jest.fn(),
      setAllDay: jest.fn(),
      setRepetition: mockSetRepetition,
      setShowRepeat: mockSetShowRepeat,
      setAttendees: jest.fn(),
      setAlarm: jest.fn(),
      setEventClass: jest.fn(),
      setBusy: jest.fn(),
      setTimezone: jest.fn(),
      setHasVideoConference: jest.fn(),
      setMeetingLink: jest.fn()
    }

    populateFormFromEvent(params)

    expect(mockSetRepetition).toHaveBeenCalledWith(
      new RepetitionObject({
        freq: 'WEEKLY',
        interval: 1,
        occurrences: undefined,
        endDate: undefined,
        byday: ['MO'],
        wkst: 'SU',
        allday: false,
        timezone: 'Europe/Paris'
      })
    )
    expect(mockSetShowRepeat).toHaveBeenCalledWith(true)
  })

  it('sets wkst to null if wkst is not provided in repetition', () => {
    const mockSetRepetition = jest.fn()
    const mockSetShowRepeat = jest.fn()

    const event = {
      uid: 'event-id',
      title: 'Test Event',
      start: '2026-06-24T10:00:00Z',
      end: '2026-06-24T11:00:00Z',
      timezone: 'Europe/Paris',
      repetition: {
        freq: 'WEEKLY',
        interval: 1,
        byday: ['MO']
      }
    } as unknown as CalendarEvent

    const params = {
      event,
      setTitle: jest.fn(),
      setDescription: jest.fn(),
      setLocation: jest.fn(),
      setStart: jest.fn(),
      setEnd: jest.fn(),
      setAllDay: jest.fn(),
      setRepetition: mockSetRepetition,
      setShowRepeat: mockSetShowRepeat,
      setAttendees: jest.fn(),
      setAlarm: jest.fn(),
      setEventClass: jest.fn(),
      setBusy: jest.fn(),
      setTimezone: jest.fn(),
      setHasVideoConference: jest.fn(),
      setMeetingLink: jest.fn()
    }

    populateFormFromEvent(params)

    expect(mockSetRepetition).toHaveBeenCalledWith(
      new RepetitionObject({
        freq: 'WEEKLY',
        interval: 1,
        occurrences: undefined,
        endDate: undefined,
        byday: ['MO'],
        wkst: null,
        allday: false,
        timezone: 'Europe/Paris'
      })
    )
    expect(mockSetShowRepeat).toHaveBeenCalledWith(true)
  })
})
