import { VCalComponent } from '@common/features/Calendars/types/CalendarData'
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
      attendee?: VAlarm['attendee']
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
            attendee: alarm.attendee ?? defaults.attendee,
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
