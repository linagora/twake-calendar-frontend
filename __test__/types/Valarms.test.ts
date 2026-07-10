import { userAttendee } from '@common/features/User/models/attendee'
import { VAlarm } from '@common/types/VAlarm'
import { Valarms } from '@common/types/Valarms'

describe('Valarms', () => {
  const createAttendee = (email: string): userAttendee =>
    new userAttendee({ cal_address: `mailto:${email}`, cn: email })

  const createAlarm = (trigger: string, attendees?: userAttendee[]): VAlarm =>
    new VAlarm({
      trigger,
      action: 'EMAIL',
      attendees,
      summary: 'Test',
      description: 'Test'
    })

  const expectAlarmAttendees = (
    alarm: VAlarm | undefined,
    expectedEmails: string[]
  ): void => {
    expect(alarm?.attendees).toHaveLength(expectedEmails.length)
    expectedEmails.forEach(email => {
      expect(alarm?.attendees?.map(a => a.cal_address)).toContain(email)
    })
  }

  describe('getEditableAlarms', () => {
    it('returns global alarms when no attendee is provided', () => {
      const globalAlarm = createAlarm('-PT15M')
      const personalAlarm = createAlarm('-PT10M', [
        createAttendee('user@example.com')
      ])
      const valarms = new Valarms([globalAlarm, personalAlarm])

      const result = valarms.getEditableAlarms(undefined)

      expect(result).toHaveLength(1)
      expect(result[0].trigger).toBe('-PT15M')
    })

    it('returns global alarms with no attendees', () => {
      const alarm = createAlarm('-PT15M')
      const valarms = new Valarms([alarm])

      const result = valarms.getEditableAlarms(
        createAttendee('user@example.com')
      )

      expect(result).toHaveLength(1)
      expect(result[0].trigger).toBe('-PT15M')
    })

    it('returns global alarms with multiple attendees', () => {
      const alarm = createAlarm('-PT15M', [
        createAttendee('user1@example.com'),
        createAttendee('user2@example.com')
      ])
      const valarms = new Valarms([alarm])

      const result = valarms.getEditableAlarms(
        createAttendee('user@example.com')
      )

      expect(result).toHaveLength(1)
      expect(result[0].trigger).toBe('-PT15M')
    })

    it('returns personal alarms for the current user', () => {
      const currentUser = createAttendee('current@example.com')
      const otherUser = createAttendee('other@example.com')

      const valarms = new Valarms([
        createAlarm('-PT10M', [currentUser]),
        createAlarm('-PT5M', [otherUser])
      ])

      const result = valarms.getEditableAlarms(currentUser)

      expect(result).toHaveLength(1)
      expect(result[0].trigger).toBe('-PT10M')
    })

    it('returns both global and current user personal alarms', () => {
      const currentUser = createAttendee('current@example.com')
      const otherUser = createAttendee('other@example.com')

      const valarms = new Valarms([
        createAlarm('-PT15M'),
        createAlarm('-PT10M', [currentUser]),
        createAlarm('-PT5M', [otherUser])
      ])

      const result = valarms.getEditableAlarms(currentUser)
      const triggers = result.map(a => a.trigger)

      expect(result).toHaveLength(2)
      expect(triggers).toContain('-PT15M')
      expect(triggers).toContain('-PT10M')
      expect(triggers).not.toContain('-PT5M')
    })

    it('handles email comparison case-insensitively', () => {
      const alarm = createAlarm('-PT10M', [createAttendee('User@Example.COM')])
      const valarms = new Valarms([alarm])

      const result = valarms.getEditableAlarms(
        createAttendee('user@example.com')
      )

      expect(result).toHaveLength(1)
      expect(result[0].trigger).toBe('-PT10M')
    })
  })

  describe('mergeForPersonalSettingsUpdate', () => {
    describe('when alarm is selected', () => {
      it('preserves original alarm with both attendees', () => {
        const currentUser = createAttendee('current@example.com')
        const otherUser = createAttendee('other@example.com')

        const originalAlarms = new Valarms([
          createAlarm('-PT15M', [currentUser, otherUser])
        ])

        const formAlarms = new Valarms([
          new VAlarm({ trigger: '-PT15M', action: 'EMAIL' })
        ])

        const result = originalAlarms.mergeForPersonalSettingsUpdate(
          formAlarms,
          currentUser
        )

        expectAlarmAttendees(result.getAlarm(0), [
          'mailto:current@example.com',
          'mailto:other@example.com'
        ])
      })
    })

    describe('when alarm is deselected', () => {
      it('removes user from global alarm', () => {
        const currentUser = createAttendee('current@example.com')
        const otherUser = createAttendee('other@example.com')

        const originalAlarms = new Valarms([
          createAlarm('-PT15M', [currentUser, otherUser])
        ])

        const formAlarms = new Valarms([])

        const result = originalAlarms.mergeForPersonalSettingsUpdate(
          formAlarms,
          currentUser
        )

        expectAlarmAttendees(result.getAlarm(0), ['mailto:other@example.com'])
      })

      it('drops personal alarm when user deselects it', () => {
        const currentUser = createAttendee('current@example.com')

        const originalAlarms = new Valarms([
          createAlarm('-PT15M', [currentUser]),
          createAlarm('-PT10M', [currentUser])
        ])

        const formAlarms = new Valarms([
          new VAlarm({ trigger: '-PT15M', action: 'EMAIL' })
        ])

        const result = originalAlarms.mergeForPersonalSettingsUpdate(
          formAlarms,
          currentUser
        )

        expect(result.getAlarms()).toHaveLength(1)
        expect(result.getAlarm(0)?.trigger).toBe('-PT15M')
      })
    })

    it('preserves alarms user was never part of', () => {
      const currentUser = createAttendee('current@example.com')
      const otherUser1 = createAttendee('other1@example.com')
      const otherUser2 = createAttendee('other2@example.com')

      const originalAlarms = new Valarms([
        createAlarm('-PT15M', [currentUser]),
        createAlarm('-PT10M', [otherUser1, otherUser2])
      ])

      const formAlarms = new Valarms([
        new VAlarm({ trigger: '-PT15M', action: 'EMAIL' })
      ])

      const result = originalAlarms.mergeForPersonalSettingsUpdate(
        formAlarms,
        currentUser
      )

      expect(result.getAlarms()).toHaveLength(2)
    })

    it('handles adding new alarms from form', () => {
      const currentUser = createAttendee('current@example.com')

      const originalAlarms = new Valarms([createAlarm('-PT15M', [currentUser])])

      const formAlarms = new Valarms([
        createAlarm('-PT15M', [currentUser]),
        new VAlarm({ trigger: '-PT5M', action: 'EMAIL' })
      ])

      const result = originalAlarms.mergeForPersonalSettingsUpdate(
        formAlarms,
        currentUser
      )

      expect(result.getAlarms()).toHaveLength(2)
    })
  })
})
