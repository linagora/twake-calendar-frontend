import { ColorPicker } from '@common/components/Calendar/CalendarColorPicker'
import { defaultColors } from '@common/utils/defaultColors'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../utils/Renderwithproviders'

describe('ColorPicker keyboard and semantics', () => {
  const colors = defaultColors.slice(0, 4)

  const renderPicker = (
    selected = colors[1]
  ): { onChange: jest.Mock; radios: HTMLElement[] } => {
    const onChange = jest.fn()
    renderWithProviders(
      <ColorPicker selectedColor={selected} onChange={onChange} />
    )
    return { onChange, radios: screen.getAllByRole('radio') }
  }

  it('exposes the preset colours as a named radio group', () => {
    const { radios } = renderPicker()

    expect(screen.getByRole('radiogroup')).toHaveAccessibleName(
      'calendar.color'
    )
    expect(radios).toHaveLength(4)
    expect(radios[0]).toHaveAccessibleName('colorPicker.colors.green')
    expect(radios[1]).toHaveAttribute('aria-checked', 'true')
    expect(radios[0]).toHaveAttribute('aria-checked', 'false')
  })

  it('puts a single Tab stop on the selected colour', () => {
    const { radios } = renderPicker()

    expect(radios.map(r => r.getAttribute('tabindex'))).toEqual([
      '-1',
      '0',
      '-1',
      '-1'
    ])
  })

  it('selects the next and previous colours with the arrow keys', () => {
    const { onChange, radios } = renderPicker()

    fireEvent.keyDown(radios[1], { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith(colors[2])

    fireEvent.keyDown(radios[1], { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith(colors[0])
  })

  it('wraps around at the ends', () => {
    const { onChange, radios } = renderPicker(colors[3])

    fireEvent.keyDown(radios[3], { key: 'ArrowDown' })
    expect(onChange).toHaveBeenLastCalledWith(colors[0])
  })

  it('selects with Space', () => {
    const { onChange, radios } = renderPicker()

    fireEvent.keyDown(radios[3], { key: ' ' })
    expect(onChange).toHaveBeenLastCalledWith(colors[3])
  })

  it('lets the keyboard open the custom colour picker', () => {
    renderPicker()

    const custom = screen.getByRole('button', {
      name: 'colorPicker.selectCustom'
    })
    expect(custom).toHaveAttribute('tabindex', '0')
    expect(custom).toHaveAttribute('aria-expanded', 'false')
  })
})
