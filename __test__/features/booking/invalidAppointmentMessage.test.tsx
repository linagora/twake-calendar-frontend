import { invalidAppointmentMessage } from '../../../apps/private/src/features/booking/hooks/useAppointmentForm'

const t = (key: string): string => key

describe('invalidAppointmentMessage', () => {
  const valid = {
    calendarid: 'user1/cal1',
    duration: 30,
    availabilityRules: [
      {
        dayOfWeek: 'MON' as const,
        enabled: true,
        slots: [{ start: '09:00', end: '12:00' }]
      }
    ]
  }

  it('names the time slots that end before they start', () => {
    const message = invalidAppointmentMessage(
      {
        ...valid,
        availabilityRules: [
          {
            ...valid.availabilityRules[0],
            slots: [{ start: '12:00', end: '09:00' }]
          }
        ]
      },
      t
    )
    expect(message).toBe('booking.fillRequiredFields booking.setRegularHours')
  })

  it('names every missing field', () => {
    const message = invalidAppointmentMessage(
      { ...valid, calendarid: '', duration: 0 },
      t
    )
    expect(message).toBe(
      'booking.fillRequiredFields event.form.calendar, booking.chooseTimeSlot'
    )
  })
})
