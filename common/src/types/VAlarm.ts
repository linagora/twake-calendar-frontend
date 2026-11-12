import {
  VCalComponent,
  VObjectProperty
} from '@common/features/Calendars/types/CalendarData'
import { userAttendee } from '@common/features/User/models/attendee'
import { normalizeAlarmTrigger } from '@common/utils/normalizeAlarmTrigger'

export const DEFAULT_ALARM_DESCRIPTION =
  'This is an automatic alarm sent by Twake Calendar'

export interface AlarmData {
  uid?: string
  trigger: string
  action: string
  attendees?: userAttendee[]
  summary?: string
  description?: string
  // Properties not modelled here (REPEAT, DURATION, ATTACH, X-...), written
  // back as read so that saving the event does not degrade the alarm
  passthroughProps?: VObjectProperty[]
}

export class VAlarm implements AlarmData {
  uid?: string
  trigger: string
  action: string
  attendees?: userAttendee[]
  summary?: string
  description?: string
  passthroughProps?: VObjectProperty[]

  constructor({
    uid,
    trigger,
    action,
    attendees,
    summary,
    description,
    passthroughProps
  }: AlarmData) {
    this.uid = uid
    this.trigger = normalizeAlarmTrigger(trigger)
    this.action = action
    this.attendees = attendees
    this.summary = summary
    this.description = description ?? DEFAULT_ALARM_DESCRIPTION
    this.passthroughProps = passthroughProps
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
        uid: obj.uid,
        trigger: obj.trigger ?? '',
        action: obj.action ?? '',
        attendees,
        summary: obj.summary,
        description: obj.description,
        passthroughProps: obj.passthroughProps
      })
    }
    return new VAlarm({ trigger: '', action: '' })
  }

  asJcal(): VCalComponent {
    const props: VObjectProperty[] = [
      ['trigger', {}, 'duration', this.trigger],
      ['action', {}, 'text', this.action]
    ]
    if (this.uid) {
      props.unshift(['uid', {}, 'text', this.uid])
    }
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
    return ['valarm', [...props, ...this.unwrittenPassthroughProps(props)], []]
  }

  private unwrittenPassthroughProps(
    written: VObjectProperty[]
  ): VObjectProperty[] {
    const writtenKeys = new Set(written.map(([key]) => key.toLowerCase()))
    return (this.passthroughProps ?? []).filter(
      ([key]) => !writtenKeys.has(key.toLowerCase())
    )
  }
}
