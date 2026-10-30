import { fireEvent, renderHook } from '@testing-library/react'
import { useCalendarShortcuts } from '@common/hooks/useCalendarShortcuts'

const handlers = () => ({
  enabled: true,
  onNavigate: jest.fn(),
  onViewChange: jest.fn(),
  onCreate: jest.fn(),
  onSearch: jest.fn(),
  onShowHelp: jest.fn()
})

describe('calendar shortcuts', () => {
  it.each([
    ['t', 'today'],
    ['n', 'next'],
    ['j', 'next'],
    ['p', 'prev'],
    ['k', 'prev']
  ])('%s navigates to %s', (key, action) => {
    const props = handlers()
    renderHook(() => useCalendarShortcuts(props))
    fireEvent.keyDown(document.body, { key })
    expect(props.onNavigate).toHaveBeenCalledWith(action)
  })

  it.each([
    ['d', 'timeGridDay'],
    ['w', 'timeGridWeek'],
    ['m', 'dayGridMonth'],
    ['a', 'listWeek']
  ])('%s changes view', (key, view) => {
    const props = handlers()
    renderHook(() => useCalendarShortcuts(props))
    fireEvent.keyDown(document.body, { key })
    expect(props.onViewChange).toHaveBeenCalledWith(view)
  })

  it('creates, searches, and opens help, preventing browser defaults', () => {
    const props = handlers()
    renderHook(() => useCalendarShortcuts(props))
    for (const key of ['c', '/', '?']) {
      expect(fireEvent.keyDown(document.body, { key })).toBe(false)
    }
    expect(props.onCreate).toHaveBeenCalledTimes(1)
    expect(props.onSearch).toHaveBeenCalledTimes(1)
    expect(props.onShowHelp).toHaveBeenCalledTimes(1)
  })

  it.each([
    'input',
    'textarea',
    'select',
    '[contenteditable]',
    '[role="combobox"]'
  ])('ignores editing in %s', selector => {
    const props = handlers()
    renderHook(() => useCalendarShortcuts(props))
    const element = document.createElement(
      selector.startsWith('[') ? 'div' : selector
    )
    if (selector === '[contenteditable]')
      element.setAttribute('contenteditable', 'true')
    if (selector === '[role="combobox"]')
      element.setAttribute('role', 'combobox')
    document.body.append(element)
    fireEvent.keyDown(element, { key: 'c' })
    expect(props.onCreate).not.toHaveBeenCalled()
    element.remove()
  })

  it('ignores dialogs, modifiers, composition, repeats and disabled pages', () => {
    const props = handlers()
    const { rerender } = renderHook(() => useCalendarShortcuts(props))
    for (const extra of [
      { ctrlKey: true },
      { altKey: true },
      { metaKey: true },
      { isComposing: true },
      { repeat: true }
    ]) {
      fireEvent.keyDown(document.body, { key: 'c', ...extra })
    }
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    document.body.append(dialog)
    fireEvent.keyDown(document.body, { key: 'c' })
    dialog.remove()
    props.enabled = false
    rerender()
    fireEvent.keyDown(document.body, { key: 'c' })
    expect(props.onCreate).not.toHaveBeenCalled()
  })

  it('removes its listener on unmount', () => {
    const props = handlers()
    const { unmount } = renderHook(() => useCalendarShortcuts(props))
    unmount()
    fireEvent.keyDown(document.body, { key: 'c' })
    expect(props.onCreate).not.toHaveBeenCalled()
  })
})
