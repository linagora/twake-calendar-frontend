import { populateFormFromEvent } from '@common/features/Events/formHelpers'
import { CalendarEvent } from '@common/types/EventsTypes'
import { RepetitionObject } from '@common/types/Repetition'

describe('populateFormFromEvent', () => {
  it('correctly sets repetition data with wkst included', () => {
    const mockSetRepetition = vi.fn()
    const mockSetShowRepeat = vi.fn()

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
      setTitle: vi.fn(),
      setDescription: vi.fn(),
      setLocation: vi.fn(),
      setStart: vi.fn(),
      setEnd: vi.fn(),
      setAllDay: vi.fn(),
      setRepetition: mockSetRepetition,
      setShowRepeat: mockSetShowRepeat,
      setAttendees: vi.fn(),
      setAlarm: vi.fn(),
      setEventClass: vi.fn(),
      setBusy: vi.fn(),
      setTimezone: vi.fn(),
      setHasVideoConference: vi.fn(),
      setMeetingLink: vi.fn()
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
    const mockSetRepetition = vi.fn()
    const mockSetShowRepeat = vi.fn()

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
      setTitle: vi.fn(),
      setDescription: vi.fn(),
      setLocation: vi.fn(),
      setStart: vi.fn(),
      setEnd: vi.fn(),
      setAllDay: vi.fn(),
      setRepetition: mockSetRepetition,
      setShowRepeat: mockSetShowRepeat,
      setAttendees: vi.fn(),
      setAlarm: vi.fn(),
      setEventClass: vi.fn(),
      setBusy: vi.fn(),
      setTimezone: vi.fn(),
      setHasVideoConference: vi.fn(),
      setMeetingLink: vi.fn()
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
