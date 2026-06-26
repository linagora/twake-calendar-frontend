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
  attendees?: userAttendee[]
  summary?: string
  description?: string
}

export class VAlarm implements AlarmData {
  trigger: string
  action: string
  attendees?: userAttendee[]
  summary?: string
  description?: string

  constructor({ trigger, action, attendees, summary, description }: AlarmData) {
    this.trigger = trigger
    this.action = action
    this.attendees = attendees
    this.summary = summary
    this.description = description ?? DEFAULT_ALARM_DESCRIPTION
  }

  static fromJSON(json: unknown): VAlarm {
    if (json instanceof VAlarm) {
      return json
    }
    if (json && typeof json === 'object') {
      const obj = json as Partial<AlarmData>
      // Deserialize attendees if they're plain objects (from JSON/session storage)
      let attendees = obj.attendees
      if (attendees && Array.isArray(attendees)) {
        attendees = attendees.map(attendee =>
          attendee &&
          typeof attendee === 'object' &&
          !(attendee instanceof userAttendee)
            ? new userAttendee(attendee as Partial<userAttendee>)
            : attendee
        )
      }
      return new VAlarm({
        trigger: obj.trigger ?? '',
        action: obj.action ?? '',
        attendees,
        summary: obj.summary,
        description: obj.description
      })
    }
    return new VAlarm({ trigger: '', action: '' })
  }

  asJcal(): VCalComponent {
    const props: VObjectProperty[] = [
      ['trigger', {}, 'duration', this.trigger],
      ['action', {}, 'text', this.action]
    ]
    if (this.attendees) {
      for (const attendee of this.attendees) {
        props.push(['attendee', {}, 'cal-address', attendee.asMailto()])
      }
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
