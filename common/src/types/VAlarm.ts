import {
  VCalComponent,
  VObjectProperty
} from '@common/features/Calendars/types/CalendarData'
import { userAttendee } from '@common/features/User/models/attendee'

export const DEFAULT_ALARM_DESCRIPTION =
  'This is an automatic alarm sent by Twake Calendar'

export interface AlarmData {
  trigger: string
  action: string
  attendee?: userAttendee
  summary?: string
  description?: string
}

export class VAlarm implements AlarmData {
  trigger: string
  action: string
  attendee?: userAttendee
  summary?: string
  description?: string

  constructor({ trigger, action, attendee, summary, description }: AlarmData) {
    this.trigger = trigger
    this.action = action
    this.attendee = attendee
    this.summary = summary
    this.description = description ?? DEFAULT_ALARM_DESCRIPTION
  }

  asJcal(): VCalComponent {
    const props: VObjectProperty[] = [
      ['trigger', {}, 'duration', this.trigger],
      ['action', {}, 'text', this.action]
    ]
    if (this.attendee) {
      props.push(['attendee', {}, 'cal-address', this.attendee.asMailto()])
    }
    if (this.summary) {
      props.push(['summary', {}, 'text', this.summary])
    }
    if (this.description) {
      props.push(['description', {}, 'text', this.description])
    }
    return ['valarm', props, []]
  }
}
