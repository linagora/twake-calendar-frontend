/**
 * @vitest-environment jsdom
 */
import { sanitizeHtml } from '../sanitizeUtils'

vi.mock('dompurify', async () => ({
  default: (
    await vi.importActual<typeof import('dompurify')>('dompurify')
  ).default(window)
}))

describe('sanitizeUtils', () => {
  describe('sanitizeHtml', () => {
    it('should return empty string if input is falsy', () => {
      expect(sanitizeHtml('')).toBe('')
      expect(sanitizeHtml(null as any)).toBe('')
    })

    it('should keep basic text styling tags', () => {
      const input =
        '<p><b>bold</b> <i>italic</i> <u>underlined</u> <s>crossed</s></p>'
      expect(sanitizeHtml(input)).toBe(input)
    })

    it('should keep lists', () => {
      const input =
        '<ul><li>item 1</li><li>item 2</li></ul><ol><li>item A</li></ol>'
      expect(sanitizeHtml(input)).toBe(input)
    })

    it('should strip headings but keep their content', () => {
      const input = '<h1>Heading 1</h1><h2>Heading 2</h2>'
      expect(sanitizeHtml(input)).toBe('Heading 1Heading 2')
    })

    it('should strip CSS styles', () => {
      const input =
        '<p style="color: red; font-size: 20px;">Text with style</p>'
      expect(sanitizeHtml(input)).toBe('<p>Text with style</p>')
    })

    it('should remove scripts and other dangerous tags', () => {
      const input =
        '<script>alert(1)</script><p>safe text</p><iframe src="dangerous"></iframe>'
      expect(sanitizeHtml(input)).toBe('<p>safe text</p>')
    })

    it('should open the links of the description in a new tab', () => {
      const input =
        '<a href="https://example.com" target="_top" rel="opener">link</a>'
      expect(sanitizeHtml(input)).toBe(
        '<a href="https://example.com" target="_blank" rel="noopener noreferrer">link</a>'
      )
    })

    it('should remove data-* and aria-* attributes', () => {
      expect(sanitizeHtml('<b data-x="1" aria-label="other">Hello</b>')).toBe(
        '<b>Hello</b>'
      )

      const link = document.createElement('div')
      link.innerHTML = sanitizeHtml(
        '<a href="https://example.com" data-event-id="twake-draft-event">x</a>'
      )
      expect(link.querySelector('a')?.hasAttribute('data-event-id')).toBe(false)
      expect(link.querySelector('a')?.getAttribute('href')).toBe(
        'https://example.com'
      )
    })

    it('should open links without a target in a new tab', () => {
      const input = '<a href="https://example.com">link</a>'
      expect(sanitizeHtml(input)).toBe(
        '<a href="https://example.com" target="_blank" rel="noopener noreferrer">link</a>'
      )
    })
  })
})
