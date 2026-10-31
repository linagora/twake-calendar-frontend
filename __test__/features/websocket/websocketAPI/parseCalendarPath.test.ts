import { parseCalendarPath } from '@common/websocket/messaging/parseCalendarPath'

describe('parseCalendarPath', () => {
  it('should return the user and calendar ids of a calendar path', () => {
    expect(parseCalendarPath('/calendars/u1/c1')).toBe('u1/c1')
  })

  it.each([
    [['/calendars/a/a']],
    [{ toString: {} }],
    [[{ toString: 1 }]],
    [42],
    [null],
    ['/not/a/calendar']
  ])('should return null for %p', key => {
    expect(parseCalendarPath(key)).toBeNull()
  })
})
