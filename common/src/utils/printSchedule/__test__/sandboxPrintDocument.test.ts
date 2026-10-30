/**
 * @vitest-environment jsdom
 */
import { sandboxPrintDocument } from '../index'

describe('sandboxPrintDocument', () => {
  const printable =
    '<!doctype html><html><head><title>Schedule</title></head>' +
    '<body><p class="title">R&amp;D "sync" &lt;b&gt;</p>' +
    '<script>window.print()</script></body></html>'

  function render(html: string, title = 'Schedule'): Document {
    return new DOMParser().parseFromString(
      sandboxPrintDocument(html, title),
      'text/html'
    )
  }

  it('renders the schedule in an iframe sandboxed without same origin', () => {
    const iframe = render(printable).querySelector('iframe')

    expect(iframe).not.toBeNull()
    const sandbox = (iframe?.getAttribute('sandbox') ?? '').split(' ')
    expect(sandbox).toEqual(
      expect.arrayContaining(['allow-scripts', 'allow-modals'])
    )
    expect(sandbox).not.toContain('allow-same-origin')
    expect(sandbox).not.toContain('allow-top-navigation')
    expect(sandbox).not.toContain('allow-popups')
  })

  it('hands the schedule over unchanged', () => {
    const iframe = render(printable).querySelector('iframe')

    expect(iframe?.getAttribute('srcdoc')).toBe(printable)
  })

  it('keeps the schedule out of the wrapping document', () => {
    const wrapper = render(printable)

    expect(wrapper.querySelectorAll('script')).toHaveLength(0)
    expect(wrapper.querySelectorAll('iframe')).toHaveLength(1)
  })

  it('escapes the title', () => {
    const wrapper = render(printable, '</title><script>x</script>')

    expect(wrapper.title).toBe('</title><script>x</script>')
    expect(wrapper.querySelectorAll('script')).toHaveLength(0)
  })
})
