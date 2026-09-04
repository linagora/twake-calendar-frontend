/**
 * @jest-environment jsdom
 */
import {
  EventDescriptionBuilder,
  EVENT_FOOTER_SEPARATOR
} from '../EventDescriptionBuilder'
import { Attachment } from '@common/types/Attachment'

// Mock DOMPurify as done in descriptionUtils.test.ts
jest.mock('dompurify', () => {
  return jest.requireActual('dompurify')(window)
})

describe('EventDescriptionBuilder', () => {
  beforeEach(() => {
    // Enable attachments for testing
    ;(window as any).ENABLE_EVENT_ATTACHMENTS = true
  })

  it('should initialize with text and no attachments by default', () => {
    const builder = new EventDescriptionBuilder()
    expect(builder.buildHtml()).toBe('')
    expect(builder.getAttachments()).toEqual([])
    expect(builder.hasContent()).toBe(false)
  })

  describe('removeFooter', () => {
    it('should remove footer block', () => {
      const text = `Meeting notes\n\n${EVENT_FOOTER_SEPARATOR}\nJoin Visio: https://visio.link/123\n${EVENT_FOOTER_SEPARATOR}`
      const builder = new EventDescriptionBuilder(text).removeFooter()
      expect(builder.buildHtml()).toBe('Meeting notes')
    })

    it('should leave description unchanged when no footer is present', () => {
      const text = 'Just a regular meeting description.'
      const builder = new EventDescriptionBuilder(text).removeFooter()
      expect(builder.buildHtml()).toBe(text)
    })

    it('should remove every footer block when several are present', () => {
      const text = `Notes\n\n${EVENT_FOOTER_SEPARATOR}\nJoin Visio: a\n${EVENT_FOOTER_SEPARATOR}\n\nMore\n\n${EVENT_FOOTER_SEPARATOR}\nJoin Visio: b\n${EVENT_FOOTER_SEPARATOR}\n\nTail`
      const builder = new EventDescriptionBuilder(text).removeFooter()
      expect(builder.buildHtml()).toBe('Notes\nMore\nTail')
    })

    it('should leave an unterminated separator untouched', () => {
      const text = `Notes\n\n${EVENT_FOOTER_SEPARATOR}\nJoin Visio: a`
      const builder = new EventDescriptionBuilder(text).removeFooter()
      expect(builder.buildHtml()).toBe(text)
    })

    it('should not leave a leading newline when the footer opens the description', () => {
      const text = `${EVENT_FOOTER_SEPARATOR}\nJoin Visio: a\n${EVENT_FOOTER_SEPARATOR}\n\nMeeting notes`
      const builder = new EventDescriptionBuilder(text).removeFooter()
      expect(builder.buildHtml()).toBe('Meeting notes')
    })

    // Regression guard for the quadratic backtracking the scan-based
    // implementation replaced. No wall-clock assertion: the previous
    // implementation needed ~40s on this input and so blows the suite timeout
    // on its own, whereas a threshold would be a coin flip on a loaded CI box.
    it('should stay usable on a long run of newlines before a separator', () => {
      const text = `${'\n'.repeat(400000)}${EVENT_FOOTER_SEPARATOR}`
      const builder = new EventDescriptionBuilder(text).removeFooter()
      expect(builder.buildHtml()).toBe(text.trimEnd())
    })
  })

  describe('withFooter', () => {
    it('should do nothing if neither meeting link nor attachments are present', () => {
      const text = 'Meeting notes'
      const builder = new EventDescriptionBuilder(text).withFooter(null)
      expect(builder.buildHtml()).toBe(text)
    })

    it('should append meeting link only', () => {
      const text = 'Meeting notes'
      const builder = new EventDescriptionBuilder(text).withFooter(
        'https://visio.link/123'
      )
      expect(builder.buildHtml()).toContain(
        'Join Visio : https://visio.link/123'
      )
      expect(builder.buildHtml()).toContain(EVENT_FOOTER_SEPARATOR)
    })

    it('should append attachments only', () => {
      const text = 'Meeting notes'
      const attach = new Attachment(
        'https://example.com/file',
        'type',
        'file.pdf'
      )
      const builder = new EventDescriptionBuilder(text, [attach]).withFooter(
        null
      )
      expect(builder.buildHtml()).toContain('Attachments :')
      expect(builder.buildHtml()).toContain(
        '• file.pdf: https://example.com/file'
      )
      expect(builder.buildHtml()).toContain(EVENT_FOOTER_SEPARATOR)
    })

    it('should append both meeting link and attachments', () => {
      const text = 'Meeting notes'
      const attach = new Attachment(
        'https://example.com/file',
        'type',
        'file.pdf'
      )
      const builder = new EventDescriptionBuilder(text, [attach]).withFooter(
        'https://visio.link/123'
      )
      const html = builder.buildHtml()
      expect(html).toContain('Join Visio : https://visio.link/123')
      expect(html).toContain('Attachments :')
      expect(html).toContain('• file.pdf: https://example.com/file')
      expect(html).toContain(EVENT_FOOTER_SEPARATOR)
    })
  })

  it('should sanitize HTML', () => {
    const text = '<h1>Heading</h1><p style="color: red;">Text</p>'
    const builder = new EventDescriptionBuilder(text).sanitize()
    expect(builder.buildHtml()).toBe('Heading<p>Text</p>')
  })

  it('should filter displayable attachments', () => {
    const attach1 = { hasDisplayableFilename: () => true } as Attachment
    const attach2 = { hasDisplayableFilename: () => false } as Attachment

    const builder = new EventDescriptionBuilder('', [
      attach1,
      attach2
    ]).filterAttachments()
    expect(builder.getAttachments()).toEqual([attach1])
  })

  it('should return empty attachments if ENABLE_EVENT_ATTACHMENTS is false', () => {
    ;(window as any).ENABLE_EVENT_ATTACHMENTS = false
    const attach1 = { hasDisplayableFilename: () => true } as Attachment

    const builder = new EventDescriptionBuilder('', [
      attach1
    ]).filterAttachments()
    expect(builder.getAttachments()).toEqual([])
  })

  it('should strip the visio footer when building plain text for the grid preview', () => {
    const text = `Weekly sync\n\n${EVENT_FOOTER_SEPARATOR}\nJoin Visio : https://visio.link/123\n\nPlease do not edit this section.\n${EVENT_FOOTER_SEPARATOR}`
    const plain = new EventDescriptionBuilder(text)
      .removeFooter()
      .buildPlainText()
    expect(plain).toBe('Weekly sync')
    expect(plain).not.toContain('visio.link')
    expect(plain).not.toContain(EVENT_FOOTER_SEPARATOR)
  })

  it('should chain methods', () => {
    const attach = new Attachment('url', 'type', 'name')
    const text = `<h1>Meeting</h1>\n\n${EVENT_FOOTER_SEPARATOR}\nJoin Visio: https://visio.link/123\n${EVENT_FOOTER_SEPARATOR}`

    const builder = new EventDescriptionBuilder(text, [attach])
      .removeFooter()
      .sanitize()
      .filterAttachments()

    expect(builder.buildHtml()).toBe('Meeting')
    expect(builder.getAttachments()).toEqual([attach])
    expect(builder.hasContent()).toBe(true)
  })

  it('should preserve search-result behavior and correctly decode quoted > characters and nested HTML entities like &amp;amp;', () => {
    const text =
      '<html><body>Text with a <b title=">">quoted tag</b> and &amp;amp;</body></html>'
    const builder = new EventDescriptionBuilder(text)

    // First, verify the original builder behavior correctly decodes these with DOMParser
    expect(builder.buildPlainText()).toBe('Text with a quoted tag and &amp;')

    const text2 = '<a title=">">link &amp;amp;</a>'
    const builder2 = new EventDescriptionBuilder(text2)
    expect(builder2.buildPlainText()).toBe('link &amp;')
  })

  describe('linkify (security & edge cases)', () => {
    it('should convert a bare URL to a clickable link', () => {
      const text = 'Check out https://linagora.com for more info.'
      const builder = new EventDescriptionBuilder(text).linkify()
      expect(builder.buildHtml()).toBe(
        'Check out <a href="https://linagora.com" target="_blank" rel="noopener noreferrer">https://linagora.com</a> for more info.'
      )
    })

    it('should NOT alter URLs that are already inside HTML attributes (e.g., href)', () => {
      const text = '<a href="https://evil.com">https://good.com</a>'
      const builder = new EventDescriptionBuilder(text).linkify()
      // Note: The text inside the tag 'https://good.com' is technically outside an HTML tag.
      // But the attribute 'https://evil.com' should remain untouched.
      expect(builder.buildHtml()).toBe(
        '<a href="https://evil.com">https://good.com</a>'
      )
    })

    it('should NOT break existing image tags with URLs in src', () => {
      const text = '<img src="https://example.com/image.png" />'
      const builder = new EventDescriptionBuilder(text).linkify()
      expect(builder.buildHtml()).toBe(
        '<img src="https://example.com/image.png" />'
      )
    })

    it('should NOT include trailing quotes in the URL when it is next to quotes', () => {
      const text = 'He said: "Go to https://example.com".'
      const builder = new EventDescriptionBuilder(text).linkify()
      expect(builder.buildHtml()).toBe(
        'He said: "Go to <a href="https://example.com" target="_blank" rel="noopener noreferrer">https://example.com</a>".'
      )
    })
  })
})
