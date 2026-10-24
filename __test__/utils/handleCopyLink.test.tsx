import { handleCopyLink } from '@common/utils/handleCopyLink'

const clipboardIn = (target: Window): jest.Mock => {
  const writeText = jest.fn().mockResolvedValue(undefined)
  Object.defineProperty(target.navigator, 'clipboard', {
    value: { writeText },
    configurable: true
  })
  return writeText
}

describe('handleCopyLink', () => {
  it('writes through the window of the clicked element, which holds the focus', async () => {
    const frame = document.createElement('iframe')
    document.body.appendChild(frame)
    const overlay = frame.contentWindow as Window
    const button = overlay.document.createElement('button')
    overlay.document.body.appendChild(button)
    const ownClipboard = clipboardIn(window)
    const overlayClipboard = clipboardIn(overlay)
    const setOpen = jest.fn()

    handleCopyLink(new URL('https://meet.example/abc'), setOpen, button)
    await Promise.resolve()

    expect(overlayClipboard).toHaveBeenCalledWith('https://meet.example/abc')
    expect(ownClipboard).not.toHaveBeenCalled()
    expect(setOpen).toHaveBeenCalledWith(true)
  })
})
