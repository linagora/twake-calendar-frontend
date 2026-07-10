import { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import { userAttendee } from '@common/features/User/models/attendee'
import { VAlarm } from './VAlarm'

export class Valarms {
  private _alarms: VAlarm[]

  constructor(alarms: VAlarm[] = []) {
    this._alarms = alarms
  }

  static fromList(alarms: VAlarm[]): Valarms {
    return new Valarms(alarms)
  }

  static fromFormValues(
    valarms: Valarms | undefined,
    defaults: {
      attendees?: userAttendee[]
      summary?: string
      description?: string
    }
  ): Valarms {
    return Valarms.fromList(
      (valarms?.getAlarms() ?? []).map(
        alarm =>
          new VAlarm({
            trigger: alarm.trigger,
            action: alarm.action,
            attendees: alarm.attendees ?? defaults.attendees,
            summary: alarm.summary ?? defaults.summary,
            description: alarm.description ?? defaults.description
          })
      )
    )
  }

  private static extractAlarmsFromObject(json: object): VAlarm[] {
    if (!('_alarms' in json)) return []
    const alarms = (json as { _alarms: unknown })._alarms
    return Array.isArray(alarms) ? alarms.map(a => VAlarm.fromJSON(a)) : []
  }

  static fromJSON(json: unknown): Valarms {
    if (json instanceof Valarms) {
      return json
    }
    if (Array.isArray(json)) {
      return Valarms.fromList(json.map(a => VAlarm.fromJSON(a)))
    }
    if (json && typeof json === 'object') {
      return Valarms.fromList(Valarms.extractAlarmsFromObject(json))
    }
    return new Valarms()
  }

  getAlarms(): VAlarm[] {
    return this._alarms
  }

  addAlarm(alarm: VAlarm): Valarms {
    return new Valarms([...this._alarms, alarm])
  }

  removeAlarm(index: number): Valarms | undefined {
    if (index >= 0 && index < this._alarms.length) {
      return new Valarms(this._alarms.filter((_, i) => i !== index))
    }
  }

  getAlarm(index: number): VAlarm | undefined {
    return this._alarms[index]
  }

  getAllAlarmsForAttendee(attendee: userAttendee | undefined): VAlarm[] {
    if (!attendee) return []
    const attendeeEmail = this.normalizeEmail(attendee.cal_address)
    return this._alarms.filter(
      alarm =>
        alarm?.attendees?.length &&
        alarm.attendees.some(
          a => this.normalizeEmail(a.cal_address) === attendeeEmail
        )
    )
  }

  getGlobalAlarm(index: number): VAlarm | undefined {
    return this._alarms.filter(
      alarm => !alarm.attendees || alarm.attendees.length > 1
    )[index]
  }

  getGlobalAlarms(): VAlarm[] {
    return this._alarms.filter(
      alarm => !alarm.attendees || alarm.attendees.length > 1
    )
  }

  /**
   * Get alarms that should be shown in the edit form for a specific attendee.
   * Includes global alarms (no attendees or multiple attendees) AND
   * the attendee's personal alarms (single attendee matching the user).
   */
  getEditableAlarms(attendee: userAttendee | undefined): VAlarm[] {
    if (!attendee) return this.getGlobalAlarms()
    const attendeeEmail = this.normalizeEmail(attendee.cal_address)

    const globalAlarms = this.getGlobalAlarms()
    const personalAlarms = this._alarms.filter(
      alarm =>
        alarm.attendees?.length === 1 &&
        this.normalizeEmail(alarm.attendees[0].cal_address) === attendeeEmail
    )

    return [...globalAlarms, ...personalAlarms]
  }

  /**
   * Merge personal alarms from newPersonalAlarms with this Valarms.
   * Replaces existing personal alarms for the given attendee with new ones.
   * Keeps all other alarms (global alarms and other attendees' personal alarms).
   */
  mergePersonalAlarms(
    newPersonalAlarms: Valarms,
    attendee: userAttendee | undefined
  ): Valarms {
    if (!attendee) return newPersonalAlarms

    const attendeeEmail = this.normalizeEmail(attendee.cal_address)

    // Keep all alarms that are NOT for this attendee (global + other personal)
    const otherAlarms = this._alarms.filter(alarm => {
      // Keep global alarms (no attendees or multiple attendees)
      if (!alarm.attendees || alarm.attendees.length !== 1) return true
      // Keep other attendees' personal alarms
      const alarmEmail = this.normalizeEmail(alarm.attendees[0].cal_address)
      return alarmEmail !== attendeeEmail
    })

    // Combine: other alarms + new personal alarms
    return Valarms.fromList([...otherAlarms, ...newPersonalAlarms.getAlarms()])
  }

  /**
   * Merge personal alarms from originalAlarms into this Valarms.
   * This is used when the form only contains global alarms but we need to
   * preserve personal alarms from the original event.
   */
  withPersonalAlarmsFrom(originalAlarms: Valarms): Valarms {
    // Get personal alarms from original (alarms with single attendee)
    const personalAlarms = originalAlarms.getAlarms().filter(alarm => {
      return alarm.attendees && alarm.attendees.length === 1
    })

    // Combine: personal alarms from original + global alarms from this
    return Valarms.fromList([...personalAlarms, ...this._alarms])
  }

  private withUserRemovedFromGlobalAlarm(
    alarm: VAlarm,
    attendeeEmail: string
  ): VAlarm | null {
    const remaining = (alarm.attendees ?? []).filter(
      a => a.cal_address.toLowerCase().replace('mailto:', '') !== attendeeEmail
    )
    if (!remaining.length) return null
    return new VAlarm({
      trigger: alarm.trigger,
      action: alarm.action,
      attendees: remaining,
      summary: alarm.summary,
      description: alarm.description
    })
  }

  /**
   * Merge form alarms back with original event alarms for a personal settings update.
   * - For selected alarms: uses the original alarm data (preserving attendees)
   * - For deselected global alarms: removes user from attendees
   * - If a global alarm has no attendees left after removal, drops it
   * - Preserves other attendees' personal alarms and global alarms the user was never part of
   */
  mergeForPersonalSettingsUpdate(
    formAlarms: Valarms,
    attendee: userAttendee | undefined
  ): Valarms {
    if (!attendee) return formAlarms

    const attendeeEmail = this.normalizeEmail(attendee.cal_address)
    const selectedTriggers = new Set(formAlarms.getAlarms().map(a => a.trigger))

    const selectedAlarms = this.processSelectedAlarms(formAlarms)
    const deselectedAlarms = this.processDeselectedAlarms(
      selectedTriggers,
      attendeeEmail
    )

    return Valarms.fromList([...selectedAlarms, ...deselectedAlarms])
  }

  private normalizeEmail(email: string): string {
    return email.toLowerCase().replace('mailto:', '')
  }

  private alarmHasAttendee(
    alarmAttendees: userAttendee[] | undefined,
    targetEmail: string
  ): boolean {
    if (!alarmAttendees) return false
    return alarmAttendees.some(
      a => this.normalizeEmail(a.cal_address) === targetEmail
    )
  }

  private processSelectedAlarms(formAlarms: Valarms): VAlarm[] {
    return formAlarms.getAlarms().map(formAlarm => {
      const originalAlarm = this._alarms.find(
        a => a.trigger === formAlarm.trigger
      )
      return originalAlarm ?? formAlarm
    })
  }

  private processDeselectedAlarms(
    selectedTriggers: Set<string>,
    attendeeEmail: string
  ): VAlarm[] {
    const result: VAlarm[] = []

    for (const alarm of this._alarms) {
      if (selectedTriggers.has(alarm.trigger)) continue

      const processedAlarm = this.processDeselectedAlarm(alarm, attendeeEmail)
      if (processedAlarm) {
        result.push(processedAlarm)
      }
    }

    return result
  }

  private processDeselectedAlarm(
    alarm: VAlarm,
    attendeeEmail: string
  ): VAlarm | null {
    const hasAttendee = this.alarmHasAttendee(alarm.attendees, attendeeEmail)

    const isPersonalForAttendee = alarm.attendees?.length === 1 && hasAttendee
    if (isPersonalForAttendee) return null

    const isGlobalWithAttendee =
      alarm.attendees && alarm.attendees.length > 1 && hasAttendee

    if (isGlobalWithAttendee) {
      return this.withUserRemovedFromGlobalAlarm(alarm, attendeeEmail)
    }

    return alarm
  }

  firstAlarmTrigger(): string {
    let i = 0
    while (i < this._alarms.length && !this._alarms[i]) {
      i++
    }
    return this._alarms[i]?.trigger ?? ''
  }

  hasAlarms(): boolean {
    return this._alarms.length > 0
  }

  count(): number {
    return this._alarms.length
  }

  asJcal(): VCalComponent[] {
    return this._alarms
      .filter(alarm => alarm.trigger)
      .map(alarm => alarm.asJcal())
  }
}
