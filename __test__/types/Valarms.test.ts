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

  describe('mergeForPersonalSettingsUpdate', () => {
    it('preserves original alarm attendees when alarm is selected', () => {
      const currentUser = createAttendee('current@example.com')
      const otherUser = createAttendee('other@example.com')

      // Original has a global alarm with both attendees
      const originalAlarms = new Valarms([
        createAlarm('-PT15M', [currentUser, otherUser]),
        createAlarm('-PT10M', [currentUser, otherUser])
      ])

      // Form only has -15M selected (form data may lack attendees)
      const formAlarms = new Valarms([
        new VAlarm({ trigger: '-PT15M', action: 'EMAIL' })
      ])

      const result = originalAlarms.mergeForPersonalSettingsUpdate(
        formAlarms,
        currentUser
      )

      // -15M should be preserved with original attendees
      const keptAlarm = result.getAlarms().find(a => a.trigger === '-PT15M')
      expect(keptAlarm?.attendees).toHaveLength(2)
      expect(keptAlarm?.attendees?.map(a => a.cal_address)).toContain(
        'mailto:current@example.com'
      )
      expect(keptAlarm?.attendees?.map(a => a.cal_address)).toContain(
        'mailto:other@example.com'
      )

      // -10M should have current user removed (now single attendee = other)
      const removedAlarm = result.getAlarms().find(a => a.trigger === '-PT10M')
      expect(removedAlarm?.attendees).toHaveLength(1)
      expect(removedAlarm?.attendees?.[0]?.cal_address).toBe(
        'mailto:other@example.com'
      )
    })

    it('drops alarm when user is the only attendee and deselects it', () => {
      const currentUser = createAttendee('current@example.com')

      // Original has a personal alarm for current user
      const originalAlarms = new Valarms([
        createAlarm('-PT15M', [currentUser]),
        createAlarm('-PT10M', [currentUser])
      ])

      // Form only has -15M selected
      const formAlarms = new Valarms([
        new VAlarm({ trigger: '-PT15M', action: 'EMAIL' })
      ])

      const result = originalAlarms.mergeForPersonalSettingsUpdate(
        formAlarms,
        currentUser
      )

      // Only -15M should remain
      expect(result.getAlarms()).toHaveLength(1)
      expect(result.getAlarm(0)?.trigger).toBe('-PT15M')
    })

    it('preserves alarms user was never part of', () => {
      const currentUser = createAttendee('current@example.com')
      const otherUser1 = createAttendee('other1@example.com')
      const otherUser2 = createAttendee('other2@example.com')

      // Original has an alarm for other users only
      const originalAlarms = new Valarms([
        createAlarm('-PT15M', [currentUser]),
        createAlarm('-PT10M', [otherUser1, otherUser2]) // current user not here
      ])

      // Form has -15M selected
      const formAlarms = new Valarms([
        new VAlarm({ trigger: '-PT15M', action: 'EMAIL' })
      ])

      const result = originalAlarms.mergeForPersonalSettingsUpdate(
        formAlarms,
        currentUser
      )

      // Both should be in result
      expect(result.getAlarms()).toHaveLength(2)
      expect(result.getAlarms().map(a => a.trigger)).toContain('-PT15M')
      expect(result.getAlarms().map(a => a.trigger)).toContain('-PT10M')

      // -10M should still have original attendees
      const otherAlarm = result.getAlarms().find(a => a.trigger === '-PT10M')
      expect(otherAlarm?.attendees).toHaveLength(2)
    })

    it('handles adding new alarms from form', () => {
      const currentUser = createAttendee('current@example.com')

      const originalAlarms = new Valarms([createAlarm('-PT15M', [currentUser])])

      // Form adds a new alarm
      const formAlarms = new Valarms([
        createAlarm('-PT15M', [currentUser]),
        new VAlarm({ trigger: '-PT5M', action: 'EMAIL' })
      ])

      const result = originalAlarms.mergeForPersonalSettingsUpdate(
        formAlarms,
        currentUser
      )

      expect(result.getAlarms()).toHaveLength(2)
      expect(result.getAlarms().map(a => a.trigger)).toContain('-PT15M')
      expect(result.getAlarms().map(a => a.trigger)).toContain('-PT5M')
    })

    it('removes user from global alarm when deselected (2 attendees)', () => {
      const currentUser = createAttendee('current@example.com')
      const otherUser = createAttendee('other@example.com')

      // Original has 2 global alarms with both attendees
      const originalAlarms = new Valarms([
        createAlarm('-PT15M', [currentUser, otherUser]),
        createAlarm('-PT10M', [currentUser, otherUser])
      ])

      // Form only has -15M selected (current user deselected -10M)
      const formAlarms = new Valarms([
        new VAlarm({ trigger: '-PT15M', action: 'EMAIL' })
      ])

      const result = originalAlarms.mergeForPersonalSettingsUpdate(
        formAlarms,
        currentUser
      )

      // -15M should be preserved with original attendees
      const keptAlarm = result.getAlarms().find(a => a.trigger === '-PT15M')
      expect(keptAlarm?.attendees).toHaveLength(2)
      expect(keptAlarm?.attendees?.map(a => a.cal_address)).toContain(
        'mailto:current@example.com'
      )
      expect(keptAlarm?.attendees?.map(a => a.cal_address)).toContain(
        'mailto:other@example.com'
      )

      // -10M should have current user removed (now single attendee = other)
      const removedAlarm = result.getAlarms().find(a => a.trigger === '-PT10M')
      expect(removedAlarm?.attendees).toHaveLength(1)
      expect(removedAlarm?.attendees?.[0]?.cal_address).toBe(
        'mailto:other@example.com'
      )
    })

    it('drops global alarm entirely when user is the only attendee left', () => {
      const currentUser = createAttendee('current@example.com')
      const otherUser = createAttendee('other@example.com')

      // Original has a global alarm with both attendees
      const originalAlarms = new Valarms([
        createAlarm('-PT15M', [currentUser, otherUser]),
        createAlarm('-PT10M', [currentUser, otherUser])
      ])

      // Form has no alarms selected (user removed all)
      const formAlarms = new Valarms([])

      const result = originalAlarms.mergeForPersonalSettingsUpdate(
        formAlarms,
        currentUser
      )

      // Both alarms should have current user removed, leaving only other user
      expect(result.getAlarms()).toHaveLength(2)

      const alarm15m = result.getAlarms().find(a => a.trigger === '-PT15M')
      expect(alarm15m?.attendees).toHaveLength(1)
      expect(alarm15m?.attendees?.[0]?.cal_address).toBe(
        'mailto:other@example.com'
      )

      const alarm10m = result.getAlarms().find(a => a.trigger === '-PT10M')
      expect(alarm10m?.attendees).toHaveLength(1)
      expect(alarm10m?.attendees?.[0]?.cal_address).toBe(
        'mailto:other@example.com'
      )
    })
  })
})
