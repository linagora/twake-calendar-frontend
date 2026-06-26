import {
  RepetitionRule,
  VObjectProperty
} from '@common/features/Calendars/types/CalendarData'
import { formatUntilForRRule } from '@common/features/Events/utils/formatDateToICal'

export interface RepetitionData {
  freq: string
  interval?: number | null
  byday?: string[] | null
  occurrences?: number | null
  endDate?: string | null
  wkst?: string | null
}

export type RepetitionOptions = Partial<RepetitionData>

export class RepetitionObject implements RepetitionData {
  freq: string
  interval?: number | null
  byday?: string[] | null
  occurrences?: number | null
  endDate?: string | null
  wkst?: string | null

  constructor({
    freq,
    interval,
    byday,
    occurrences,
    endDate,
    wkst
  }: RepetitionOptions = {}) {
    this.freq = freq ?? ''
    this.interval = interval
    this.byday = byday
    this.occurrences = occurrences
    this.endDate = endDate
    this.wkst = wkst
  }

  asJcal(allday: boolean, tzid: string): VObjectProperty {
    const repetitionRule: RepetitionRule = { freq: this.freq }
    if (this.interval != null) {
      repetitionRule.interval = this.interval
    }
    if (this.occurrences != null) {
      repetitionRule.count = this.occurrences
    }
    if (this.endDate) {
      repetitionRule.until = formatUntilForRRule(this.endDate, allday, tzid)
    }
    if (this.byday !== null && this.byday !== undefined) {
      repetitionRule.byday = this.byday
    }
    if (this.wkst) {
      repetitionRule.wkst = this.wkst
    }
    return ['rrule', {}, 'recur', repetitionRule]
  }
}
