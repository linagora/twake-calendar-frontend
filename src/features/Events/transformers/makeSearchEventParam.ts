export function makeSearchEventParam(
  query: string,
  filters: {
    searchIn: string[]
    keywords: string
    organizers: string[]
    attendees: string[]
  }
): {
  query: string
  calendars: {
    calendarId: string
    userId: string
  }[]
  organizers?: string[] | undefined
  attendees?: string[] | undefined
} {
  const { keywords, searchIn, organizers, attendees } = filters

  const reqParam: {
    query: string
    calendars: { calendarId: string; userId: string }[]
    organizers?: string[]
    attendees?: string[]
  } = {
    query: keywords || query,
    calendars: searchIn.map(calId => {
      const [userId, calendarId] = calId.split('/')
      return { calendarId, userId }
    })
  }
  if (organizers.length) {
    reqParam.organizers = organizers
  }
  if (attendees.length) {
    reqParam.attendees = attendees
  }
  return reqParam
}
