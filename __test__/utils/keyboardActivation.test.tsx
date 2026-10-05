import { fireEvent, render, screen } from '@testing-library/react'
import {
  buttonLikeProps,
  isContextMenuKey
} from '@common/utils/keyboardActivation'

describe('buttonLikeProps', () => {
  const renderRow = (onClick: () => void): HTMLElement => {
    render(
      <div {...buttonLikeProps} onClick={onClick}>
        Sprint review
        <a href="#join">Join</a>
      </div>
    )
    return screen.getByRole('button', { name: /Sprint review/ })
  }

  it('makes the element reachable with Tab', () => {
    expect(renderRow(jest.fn())).toHaveAttribute('tabindex', '0')
  })

  it.each(['Enter', ' '])('activates the click handler with %p', key => {
    const onClick = jest.fn()
    fireEvent.keyDown(renderRow(onClick), { key })

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('ignores other keys', () => {
    const onClick = jest.fn()
    fireEvent.keyDown(renderRow(onClick), { key: 'a' })

    expect(onClick).not.toHaveBeenCalled()
  })

  it('leaves the keys of nested controls alone', () => {
    const onClick = jest.fn()
    renderRow(onClick)
    fireEvent.keyDown(screen.getByText('Join'), { key: 'Enter' })

    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('isContextMenuKey', () => {
  it.each([
    [{ key: 'ContextMenu', shiftKey: false }, true],
    [{ key: 'F10', shiftKey: true }, true],
    [{ key: 'F10', shiftKey: false }, false],
    [{ key: 'Enter', shiftKey: true }, false]
  ])('%p -> %p', (event, expected) => {
    expect(isContextMenuKey(event as unknown as React.KeyboardEvent)).toBe(
      expected
    )
  })
})
