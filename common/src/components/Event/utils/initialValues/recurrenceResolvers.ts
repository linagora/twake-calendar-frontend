import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { RepetitionObject } from '@common/types/Repetition'
import { extractEventBaseUuid } from '@common/utils/extractEventBaseUuid'

function getBaseRepetition(
  calList: Record<string, Calendar>,
  calId: string,
  uid: string
): RepetitionObject | undefined {
  return calList[calId]?.events?.[uid]?.repetition
}

function getSourceRepetition(
  event: CalendarEvent,
  calId: string | undefined,
  calList: Record<string, Calendar>
): RepetitionObject | undefined {
  if (!calList) return event.repetition

  const sourceCalId = calId || event.calId || ''
  const baseEventId = extractEventBaseUuid(event.uid || '')
  const baseRep = getBaseRepetition(calList, sourceCalId, baseEventId)

  return event.repetition || baseRep
}

/**
 * Resolves repetition rules from event or master event.
 */
export function resolveRepetition(
  event: CalendarEvent,
  calId: string | undefined,
  calList: Record<string, Calendar>
): { repetition: RepetitionObject; showRepeat: boolean } {
  const source = getSourceRepetition(event, calId, calList)

  if (!source?.freq) {
    return { repetition: {} as RepetitionObject, showRepeat: false }
  }

  return {
    repetition: new RepetitionObject({
      freq: source.freq,
      interval: source.interval || 1,
      occurrences: source.occurrences,
      endDate: source.endDate,
      byday: source.byday || null,
      wkst: source.wkst || null,
      allday: event.allday,
      timezone: event.timezone
    }),
    showRepeat: true
  }
}
