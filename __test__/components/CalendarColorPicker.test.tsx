import type { Mock } from 'vitest'
import { ColorPicker } from '@common/components/Calendar/CalendarColorPicker'
import { defaultColors } from '@common/utils/defaultColors'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../utils/Renderwithproviders'

describe('ColorPicker', () => {
  const loadedColor = { light: '#F5CFD0', dark: '#8E1E22' }

  function renderLoadedAfterMount(onChange: Mock): void {
    // Mimics CalendarModal: first rendered with the first preset, then
    // with the calendar colour once loaded
    const { rerender } = renderWithProviders(
      <ColorPicker selectedColor={defaultColors[0]} onChange={onChange} />
    )
    rerender(<ColorPicker selectedColor={loadedColor} onChange={onChange} />)
  }

  it('cancelling the custom picker restores the current colour', () => {
    const onChange = vi.fn()
    renderLoadedAfterMount(onChange)

    fireEvent.click(screen.getByLabelText('colorPicker.selectCustom'))
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }))

    expect(onChange).toHaveBeenLastCalledWith(loadedColor)
  })

  it('the custom picker starts from the current colour', () => {
    renderLoadedAfterMount(vi.fn())

    fireEvent.click(screen.getByLabelText('colorPicker.selectCustom'))

    expect(screen.getByDisplayValue(loadedColor.light)).toBeInTheDocument()
  })

  it('names each preset swatch through the translations', () => {
    renderWithProviders(
      <ColorPicker selectedColor={defaultColors[0]} onChange={vi.fn()} />
    )

    expect(
      screen.getByRole('radio', {
        name: `colorPicker.selectPreset(color=${defaultColors[0].light})`
      })
    ).toBeInTheDocument()
  })

  it('flags an invalid hex value and disables Save until it is fixed', () => {
    const onChange = vi.fn()
    renderLoadedAfterMount(onChange)

    fireEvent.click(screen.getByLabelText('colorPicker.selectCustom'))
    const hex = screen.getByRole('textbox', { name: 'colorPicker.hex' })
    const save = screen.getByRole('button', { name: 'actions.save' })

    fireEvent.change(hex, { target: { value: 'zzz' } })
    fireEvent.blur(hex)

    expect(hex).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('colorPicker.invalidHex')).toBeInTheDocument()
    expect(save).toBeDisabled()
    expect(onChange).not.toHaveBeenCalledWith(
      expect.objectContaining({ light: 'ZZZ' })
    )

    fireEvent.change(hex, { target: { value: '#12345' } })
    expect(save).toBeDisabled()

    fireEvent.change(hex, { target: { value: '#123456' } })
    fireEvent.blur(hex)

    expect(hex).toHaveAttribute('aria-invalid', 'false')
    expect(screen.queryByText('colorPicker.invalidHex')).not.toBeInTheDocument()
    expect(save).toBeEnabled()
    fireEvent.click(save)
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ light: '#123456' })
    )
  })

  it('opens again on a valid colour after an invalid value was cancelled', () => {
    renderLoadedAfterMount(vi.fn())

    fireEvent.click(screen.getByLabelText('colorPicker.selectCustom'))
    fireEvent.change(screen.getByRole('textbox', { name: 'colorPicker.hex' }), {
      target: { value: 'zzz' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }))
    fireEvent.click(screen.getByLabelText('colorPicker.selectCustom'))

    expect(screen.getByDisplayValue(loadedColor.light)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'actions.save' })).toBeEnabled()
  })

  it('groups the swatches as radios walked with the arrow keys', () => {
    const onChange = vi.fn()
    const { rerender } = renderWithProviders(
      <ColorPicker selectedColor={defaultColors[1]} onChange={onChange} />
    )

    expect(
      screen.getByRole('radiogroup', { name: 'calendar.color' })
    ).toBeInTheDocument()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(4)
    expect(radios[1]).toHaveAttribute('aria-checked', 'true')
    expect(radios[0]).toHaveAttribute('aria-checked', 'false')
    expect(radios.map(r => r.tabIndex)).toEqual([-1, 0, -1, -1])

    radios[1].focus()
    fireEvent.keyDown(radios[1], { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith(defaultColors[2])
    expect(radios[2]).toHaveFocus()

    rerender(
      <ColorPicker selectedColor={defaultColors[0]} onChange={onChange} />
    )
    fireEvent.keyDown(screen.getAllByRole('radio')[0], { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith(defaultColors[3])
  })

  it('opens the custom picker from the keyboard with focus on the Hex field', () => {
    renderWithProviders(
      <ColorPicker selectedColor={defaultColors[0]} onChange={vi.fn()} />
    )
    const custom = screen.getByRole('button', {
      name: 'colorPicker.selectCustom'
    })
    expect(custom).toHaveAttribute('tabindex', '0')
    expect(custom).toHaveAttribute('aria-expanded', 'false')

    fireEvent.keyDown(custom, { key: 'Enter' })

    expect(custom).toHaveAttribute('aria-expanded', 'true')
    expect(
      screen.getByRole('textbox', { name: 'colorPicker.hex' })
    ).toHaveFocus()
  })

  it('expands a three-digit hex value to six digits', () => {
    const onChange = vi.fn()
    renderLoadedAfterMount(onChange)

    fireEvent.click(screen.getByLabelText('colorPicker.selectCustom'))
    const hex = screen.getByRole('textbox', { name: 'colorPicker.hex' })
    fireEvent.change(hex, { target: { value: '#abc' } })
    fireEvent.blur(hex)
    fireEvent.click(screen.getByRole('button', { name: 'actions.save' }))

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ light: '#AABBCC' })
    )
  })
})
