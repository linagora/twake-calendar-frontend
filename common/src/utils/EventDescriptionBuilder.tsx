import { Attachment } from '@common/types/Attachment'
import { sanitizeHtml } from './sanitizeUtils'

export const EVENT_FOOTER_SEPARATOR =
  '-::~:~::~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~::~:~::-'

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
   */
  public removeFooter(): this {
    if (!this.text.includes(EVENT_FOOTER_SEPARATOR)) {
      return this
    }

    const sepLength = EVENT_FOOTER_SEPARATOR.length
    let result = ''
    let cursor = 0

    for (;;) {
      const start = this.text.indexOf(EVENT_FOOTER_SEPARATOR, cursor)
      if (start === -1) break
      const end = this.text.indexOf(EVENT_FOOTER_SEPARATOR, start + sepLength)
      if (end === -1) break

      let from = start
      while (from > cursor && this.text[from - 1] === '\n') from--
      let to = end + sepLength
      while (to < this.text.length && this.text[to] === '\n') to++

      result += this.text.slice(cursor, from)
      // The newline only joins what surrounds the removed block; a footer that
      // opens the description has nothing to join it to.
      if (result) result += '\n'
      cursor = to
    }

    this.text = (result + this.text.slice(cursor)).trimEnd()
    return this
  }

  public linkify(): this {
    if (!this.text) return this

    const urlRegex = /(https?:\/\/[^\s<]+)/g
    if (!urlRegex.test(this.text)) return this

    let insideAnchor = false

    this.text = this.text.replace(
      /(<[^>]+>)|(https?:\/\/[^\s<"']+)/g,
      (match: string, tag: string | undefined, url: string | undefined) => {
        if (tag) {
          if (/^<a[\s>]/i.test(tag)) insideAnchor = true
          else if (/^<\/a>/i.test(tag)) insideAnchor = false
          return tag
        }
        return url && !insideAnchor
          ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
          : match
      }
    )

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

    const { joinText, attachmentsText, doNotEditText } =
      this.getFooterTranslations(t)
    let addedContent = ''

    if (meetingLink) {
      addedContent += `${joinText} : ${meetingLink}\n`
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
      content += `• ${attachment.x_filename}: ${attachment.uri}\n`
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
