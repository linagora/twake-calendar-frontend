import { render, screen, fireEvent } from '@testing-library/react'
import { BookingMetaInfo } from '@public/components/Booking/BookingHeader/BookingMetaInfo'

vi.mock('twake-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    lang: 'en-US'
  })
}))

vi.mock('@common/components/Timezone/TimezoneSelector', () => ({
  TimezoneSelector: ({ value, onChange }: any) => (
    <select
      data-testid="timezone-selector"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="Europe/Paris">Europe/Paris</option>
      <option value="Asia/Tokyo">Asia/Tokyo</option>
    </select>
  )
}))

describe('BookingMetaInfo', () => {
  it('renders timezone selector with selected timezone and calls onTimezoneChange', () => {
    const onTimezoneChange = vi.fn()
    const referenceDate = new Date('2036-01-26T00:00:00.000Z')

    render(
      <BookingMetaInfo
        selectedTimezone="Europe/Paris"
        onTimezoneChange={onTimezoneChange}
        referenceDate={referenceDate}
      />
    )

    const select = screen.getByTestId('timezone-selector')
    expect(select).toHaveValue('Europe/Paris')

    fireEvent.change(select, { target: { value: 'Asia/Tokyo' } })
    expect(onTimezoneChange).toHaveBeenCalledWith('Asia/Tokyo')
  })
})
