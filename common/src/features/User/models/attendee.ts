import { User } from '@common/components/Attendees/types'
import { VObjectProperty } from '@common/features/Calendars/types/CalendarData'
import { userOrganiser } from '../userDataTypes'
import { Resource } from '@common/components/Attendees/ResourceSearch'

export type AttendeeRole = 'CHAIR' | 'REQ-PARTICIPANT' | 'OPT-PARTICIPANT'
export type CuType = 'INDIVIDUAL' | 'GROUP' | 'RESOURCE'
export type PartStat = 'ACCEPTED' | 'DECLINED' | 'TENTATIVE' | 'NEEDS-ACTION'

export interface UserAttendeeData {
  cal_address: string
  partstat: PartStat
  role: AttendeeRole
  cutype: CuType
  rsvp: 'TRUE' | 'FALSE'
  cn: string
  is_delegate_host: boolean
}

export type UserAttendeeOptions = Partial<UserAttendeeData>

export class userAttendee implements UserAttendeeData {
  cal_address: string
  partstat: PartStat
  role: AttendeeRole
  cutype: CuType
  rsvp: 'TRUE' | 'FALSE'
  cn: string
  is_delegate_host: boolean

  constructor({
    cal_address,
    partstat,
    role,
    cutype,
    rsvp,
    cn,
    is_delegate_host
  }: UserAttendeeOptions = {}) {
    this.cal_address = cal_address ?? ''
    this.partstat = partstat ?? 'NEEDS-ACTION'
    this.role = role ?? 'REQ-PARTICIPANT'
    this.cutype = cutype ?? 'INDIVIDUAL'
    this.rsvp = rsvp ?? 'FALSE'
    this.cn = cn ?? ''
    this.is_delegate_host = is_delegate_host ?? false
  }

  static fromOrganizer(organizer: userOrganiser | undefined): userAttendee {
    return new userAttendee({
      cal_address: organizer?.cal_address ?? '',
      cn: organizer?.cn ?? '',
      partstat: 'ACCEPTED',
      role: 'CHAIR',
      cutype: 'INDIVIDUAL',
      rsvp: 'FALSE'
    })
  }

  static fromUser(user: User): userAttendee {
    return new userAttendee({
      cal_address: user.email,
      cn: user.displayName
    })
  }

  static fromResource(resource: Resource): userAttendee {
    return new userAttendee({
      cn: resource?.displayName ?? '',
      cal_address: resource?.email ?? '',
      partstat: 'NEEDS-ACTION',
      rsvp: 'TRUE',
      role: 'REQ-PARTICIPANT',
      cutype: 'RESOURCE'
    })
  }

  static fromEmailField(email?: string): userAttendee | undefined {
    if (!email) return undefined
    return new userAttendee({
      cal_address: email.toLowerCase().startsWith('mailto:')
        ? email
        : `mailto:${email}`
    })
  }

  withPartStat(partstat: PartStat): userAttendee {
    return new userAttendee({ ...this, partstat })
  }

  withRsvp(rsvp: 'TRUE' | 'FALSE'): userAttendee {
    return new userAttendee({ ...this, rsvp })
  }

  withDelegateHost(is_delegate_host: boolean): userAttendee {
    return new userAttendee({ ...this, is_delegate_host })
  }

  asMailto(): string {
    return `mailto:${this.cal_address.replace(/^mailto:/i, '')}`
  }

  asJcal(): VObjectProperty {
    const params: Record<string, string> = {
      partstat: this.partstat,
      rsvp: this.rsvp,
      role: this.role,
      cutype: this.cutype
    }

    if (this.cn) {
      params.cn = this.cn
    }

    return ['attendee', params, 'cal-address', this.asMailto()]
  }
}
