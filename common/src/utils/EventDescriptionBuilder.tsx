import { Attachment } from '@common/types/Attachment'
import { sanitizeHtml } from './sanitizeUtils'
import linkifyHtml from 'linkify-html'
import { linkifyOptions } from './urlUtils'

// We use a new separator for new events, but we keep the legacy separator to be able to
// strip it from older event descriptions that were created before the change.
export const EVENT_FOOTER_SEPARATOR = '-_-_-_-_-_-_-_-'
export const SEPARATORS_NEED_HANDLE = [
  EVENT_FOOTER_SEPARATOR,
  '-::~:~::~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~::~:~::-'
]

const ZERO_WIDTH_SPACE = '​'

/**
 * Values written inside the footer (meeting link, attachment names and URIs)
 * come from the event and may hold a separator, which would end the footer
 * block early and leave its tail in the description. Every occurrence is
 * broken by rewriting its first character. Looping covers overlapping
 * occurrences: each pass rewrites at least one character.
 */
function neutralizeSeparatorsWith(
  value: string,
  breakFirstChar: (char: string) => string
): string {
  let result = value
  while (SEPARATORS_NEED_HANDLE.some(separator => result.includes(separator))) {
    result = SEPARATORS_NEED_HANDLE.reduce(
      (acc, separator) =>
        acc
          .split(separator)
          .join(breakFirstChar(separator[0]) + separator.slice(1)),
      result
    )
  }
  return result
}

// A zero-width space after the first character leaves the displayed text as is
function neutralizeSeparators(value: string): string {
  return neutralizeSeparatorsWith(value, char => char + ZERO_WIDTH_SPACE)
}

// A URL must still lead to the same resource: its first character is
// percent-encoded instead. Separators start with "-", an unreserved character,
// whose encoded form is equivalent (RFC 3986, section 6.2.2.2).
function neutralizeSeparatorsInUrl(url: string): string {
  return neutralizeSeparatorsWith(
    url,
    char => '%' + char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')
  )
}

function tryLinkify(html: string): string | null {
  try {
    return linkifyHtml(html, linkifyOptions)
  } catch {
    return null
  }
}

function serializeAsDom(html: string): string {
  return new DOMParser().parseFromString(html, 'text/html').body.innerHTML
}

export class EventDescriptionBuilder {
  private text: string
  private attachments: Attachment[]
  private displayableAttachments: Attachment[] = []

  constructor(initialText: string = '', attachments: Attachment[] = []) {
    this.text = initialText
    this.attachments = attachments
  }

  /**
   * Removes every `SEPARATOR ... SEPARATOR` footer block, along with the blank
   * lines surrounding it.
   *
   * Deliberately scan-based rather than regex-based: the previous
   * `\n*SEP[\s\S]*?SEP\n*` pattern backtracked over its leading `\n*` on
   * every position of a newline run, which is quadratic in the description
   * length (a remote attendee could freeze the UI thread with a description
   * made of one separator preceded by a long run of newlines).
   *
   * Separators are paired from the end: `withFooter` appends its block last,
   * so the last separator closes a block and the one before opens it. A lone
   * separator left of the footers is then kept as user text, instead of
   * opening a block that the footer's opening separator would close.
   *
   * A pair only bounds a footer when its first line holds a ":" (every footer
   * starts with a "label : value" line or a URL). Otherwise the closing
   * separator is user text, e.g. a note another client appended after the
   * footer, and is kept, so that the note survives and the footer is still
   * paired with its own opening separator.
   */
  public removeFooter(): this {
    SEPARATORS_NEED_HANDLE.forEach(separator => {
      if (this.text.includes(separator)) {
        this.removeFooterSeparator(separator)
      }
    })
    return this
  }

  private removeFooterSeparator(separator: string): void {
    let result = ''
    let cursor = 0

    this.findFooterBlocks(separator).forEach(({ from, to }) => {
      result += this.text.slice(cursor, from)
      // The newline only joins what surrounds the removed block; a footer that
      // opens the description has nothing to join it to.
      if (result) result += '\n'
      cursor = to
    })

    this.text = (result + this.text.slice(cursor)).trimEnd()
  }

  /**
   * Returns the `[from, to)` ranges of the footer blocks, surrounding newlines
   * included, in text order.
   */
  private findFooterBlocks(
    separator: string
  ): Array<{ from: number; to: number }> {
    const sepLength = separator.length
    const blocks: Array<{ from: number; to: number }> = []
    let limit = this.text.length

    while (limit >= 2 * sepLength) {
      const end = this.text.lastIndexOf(separator, limit - sepLength)
      if (end < sepLength) break
      const start = this.text.lastIndexOf(separator, end - sepLength)
      if (start === -1) break
      if (!this.looksLikeFooter(start + sepLength, end)) {
        limit = end
        continue
      }

      let from = start
      while (from > 0 && this.text[from - 1] === '\n') from--
      let to = end + sepLength
      while (to < limit && this.text[to] === '\n') to++

      blocks.push({ from, to })
      limit = from
    }

    return blocks.reverse()
  }

  // Whether the first non blank line of text[from, to) holds a ":"
  private looksLikeFooter(from: number, to: number): boolean {
    let lineStart = from
    while (lineStart < to && /\s/.test(this.text[lineStart])) lineStart++
    const newline = this.text.indexOf('\n', lineStart)
    const lineEnd = newline === -1 || newline > to ? to : newline
    return this.text.slice(lineStart, lineEnd).includes(':')
  }

  /**
   * The tokenizer bundled in linkify-html throws on some markup browsers
   * accept, e.g. an end tag carrying an attribute (`</p class="x">`). Such a
   * description is then linkified once re-serialised by the DOM, which never
   * emits that markup, and left without clickable links as a last resort.
   */
  public linkify(): this {
    if (!this.text) return this

    this.text =
      tryLinkify(this.text) ??
      tryLinkify(serializeAsDom(this.text)) ??
      this.text

    return this
  }

  public sanitize(): this {
    this.text = sanitizeHtml(this.text)
    return this
  }

  public withFooter(
    meetingLink: string | null,
    t?: (key: string) => string
  ): this {
    const hasAttachments = this.attachments?.length > 0
    if (!meetingLink && !hasAttachments) {
      return this
    }

    this.removeFooter()

    const { joinText, attachmentsText, doNotEditText } =
      this.getFooterTranslations(t)
    let addedContent = ''

    if (meetingLink) {
      addedContent += `${joinText} : ${neutralizeSeparatorsInUrl(meetingLink)}\n`
    }

    if (hasAttachments) {
      addedContent += this.buildAttachmentsText(attachmentsText)
    }

    const line = `${EVENT_FOOTER_SEPARATOR}\n${addedContent.trimEnd()}\n\n${doNotEditText}\n${EVENT_FOOTER_SEPARATOR}`
    const trimmed = this.text.trimEnd()
    this.text = trimmed ? `${trimmed}\n\n${line}` : line

    return this
  }

  private getFooterTranslations(t?: (key: string) => string): {
    joinText: string
    attachmentsText: string
    doNotEditText: string
  } {
    return {
      joinText: t?.('event.form.joinVisio') || 'Join Visio',
      attachmentsText: t?.('event.form.attachments') || 'Attachments',
      doNotEditText:
        t?.('event.form.doNotEditSection') || 'Please do not edit this section.'
    }
  }

  private buildAttachmentsText(attachmentsText: string): string {
    let content = `\n${attachmentsText} :\n`
    this.attachments.forEach(attachment => {
      content += attachment.hasDisplayableFilename()
        ? `• ${neutralizeSeparators(String(attachment.x_filename))}: ${neutralizeSeparatorsInUrl(attachment.uri)}\n`
        : `• ${neutralizeSeparatorsInUrl(attachment.uri)}\n`
    })
    return content
  }

  /**
   * Filters the attachments to only those that can be displayed.
   */
  public filterAttachments(): this {
    if (window.ENABLE_EVENT_ATTACHMENTS === true) {
      this.displayableAttachments = this.attachments.filter(a =>
        a.hasDisplayableFilename()
      )
    } else {
      this.displayableAttachments = []
    }
    return this
  }

  /**
   * Strips all HTML tags, leaving only the plain text content without formatting.
   */
  public stripHtml(): this {
    const doc = new DOMParser().parseFromString(this.text, 'text/html')
    this.text = doc.body.textContent || ''
    return this
  }

  public buildPlainText(): string {
    const doc = new DOMParser().parseFromString(this.text, 'text/html')
    return doc.body.textContent || ''
  }

  public buildHtml(): string {
    return this.text
  }

  public getAttachments(): Attachment[] {
    return this.displayableAttachments
  }

  public hasContent(): boolean {
    return Boolean(this.text || this.displayableAttachments.length)
  }
}
