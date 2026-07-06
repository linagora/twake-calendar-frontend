import { parseNewEventAttendees } from '@common/features/Events/newEventDeepLinkUtils'

describe('parseNewEventAttendees', () => {
  it('extracts a single attendee', () => {
    const params = new URLSearchParams('attendee=xxx@yyy.com')
    expect(parseNewEventAttendees(params)).toEqual(['xxx@yyy.com'])
  })

  it('extracts repeated attendee params', () => {
    const params = new URLSearchParams('attendee=a@b.com&attendee=c@d.com')
    expect(parseNewEventAttendees(params)).toEqual(['a@b.com', 'c@d.com'])
  })

  it('extracts comma separated attendees and trims blanks', () => {
    const params = new URLSearchParams('attendee=a@b.com, c@d.com ,')
    expect(parseNewEventAttendees(params)).toEqual(['a@b.com', 'c@d.com'])
  })

  it('returns an empty array when no attendee is present', () => {
    const params = new URLSearchParams('foo=bar')
    expect(parseNewEventAttendees(params)).toEqual([])
  })
})
