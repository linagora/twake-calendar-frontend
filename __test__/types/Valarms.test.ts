import { userAttendee } from '@common/features/User/models/attendee'
import { VAlarm } from '@common/types/VAlarm'
import { Valarms } from '@common/types/Valarms'

describe('Valarms', () => {
  const createAttendee = (email: string): userAttendee =>
    new userAttendee({ cal_address: `mailto:${email}`, cn: email })

  describe('getEditableAlarms', () => {
    it('returns global alarms when no attendee is provided', () => {
      const globalAlarm = new VAlarm({
        trigger: '-PT15M',
        action: 'DISPLAY'
      })
      const personalAlarm = new VAlarm({
        trigger: '-PT10M',
        action: 'EMAIL',
        attendees: [createAttendee('user@example.com')]
      })
      const valarms = new Valarms([globalAlarm, personalAlarm])

      const result = valarms.getEditableAlarms(undefined)

      expect(result).toHaveLength(1)
      expect(result[0].trigger).toBe('-PT15M')
    })

    it('returns global alarms (no attendees)', () => {
      const alarm = new VAlarm({ trigger: '-PT15M', action: 'DISPLAY' })
      const valarms = new Valarms([alarm])

      const result = valarms.getEditableAlarms(
        createAttendee('user@example.com')
      )

      expect(result).toHaveLength(1)
      expect(result[0].trigger).toBe('-PT15M')
    })

    it('returns global alarms (multiple attendees)', () => {
      const alarm = new VAlarm({
        trigger: '-PT15M',
        action: 'EMAIL',
        attendees: [
          createAttendee('user1@example.com'),
          createAttendee('user2@example.com')
        ]
      })
      const valarms = new Valarms([alarm])

      const result = valarms.getEditableAlarms(
        createAttendee('user@example.com')
      )

      expect(result).toHaveLength(1)
      expect(result[0].trigger).toBe('-PT15M')
    })

    it('returns personal alarms for the current user', () => {
      const currentUserAlarm = new VAlarm({
        trigger: '-PT10M',
        action: 'EMAIL',
        attendees: [createAttendee('current@example.com')]
      })
      const otherUserAlarm = new VAlarm({
        trigger: '-PT5M',
        action: 'EMAIL',
        attendees: [createAttendee('other@example.com')]
      })
      const valarms = new Valarms([currentUserAlarm, otherUserAlarm])

      const result = valarms.getEditableAlarms(
        createAttendee('current@example.com')
      )

      expect(result).toHaveLength(1)
      expect(result[0].trigger).toBe('-PT10M')
    })

    it('returns both global and current user personal alarms', () => {
      const globalAlarm = new VAlarm({
        trigger: '-PT15M',
        action: 'DISPLAY'
      })
      const currentUserAlarm = new VAlarm({
        trigger: '-PT10M',
        action: 'EMAIL',
        attendees: [createAttendee('current@example.com')]
      })
      const otherUserAlarm = new VAlarm({
        trigger: '-PT5M',
        action: 'EMAIL',
        attendees: [createAttendee('other@example.com')]
      })
      const valarms = new Valarms([
        globalAlarm,
        currentUserAlarm,
        otherUserAlarm
      ])

      const result = valarms.getEditableAlarms(
        createAttendee('current@example.com')
      )

      expect(result).toHaveLength(2)
      expect(result.map(a => a.trigger)).toContain('-PT15M')
      expect(result.map(a => a.trigger)).toContain('-PT10M')
      expect(result.map(a => a.trigger)).not.toContain('-PT5M')
    })

    it('handles email comparison case-insensitively', () => {
      const alarm = new VAlarm({
        trigger: '-PT10M',
        action: 'EMAIL',
        attendees: [createAttendee('User@Example.COM')]
      })
      const valarms = new Valarms([alarm])

      const result = valarms.getEditableAlarms(
        createAttendee('user@example.com')
      )

      expect(result).toHaveLength(1)
      expect(result[0].trigger).toBe('-PT10M')
    })
  })
})
