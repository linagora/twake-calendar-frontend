import {
  VObjectProperty,
  VObjectValue
} from '@common/features/Calendars/types/CalendarData'

export type AttachmentParams = Record<string, VObjectValue | VObjectValue[]>

const MODELLED_PARAMS = new Set(['fmttype', 'x-filename'])

/**
 * An ATTACH property (RFC 5545 3.8.1.1). Its value is either a URI or, when
 * `valueType` is `binary`, the base64 encoded content of an inline file.
 * Parameters other than FMTTYPE and X-FILENAME (ENCODING, SIZE, MANAGED-ID,
 * X-...) are kept in `otherParams` so that they are written back as stored.
 */
export class Attachment {
  constructor(
    public uri: string,
    public fmttype?: string,
    public x_filename?: string,
    public valueType: string = 'uri',
    public otherParams: AttachmentParams = {}
  ) {}

  static fromJcal(
    params: AttachmentParams | undefined,
    valueType: string | undefined,
    value: string
  ): Attachment {
    const allParams = params ?? {}
    const otherParams = Object.fromEntries(
      Object.entries(allParams).filter(
        ([name]) => !MODELLED_PARAMS.has(name.toLowerCase())
      )
    )
    return new Attachment(
      value,
      asOptionalString(allParams.fmttype),
      asOptionalString(allParams['x-filename']),
      valueType?.toLowerCase() || 'uri',
      otherParams
    )
  }

  isInline(): boolean {
    return this.valueType === 'binary'
  }

  hasDisplayableFilename(): boolean {
    return !!this.x_filename?.trim()
  }

  asJcal(): VObjectProperty {
    const params: AttachmentParams = { ...this.otherParams }
    if (this.fmttype) params['fmttype'] = this.fmttype
    if (this.x_filename) params['x-filename'] = this.x_filename
    return ['attach', params, this.valueType, this.uri]
  }
}

function asOptionalString(
  value: VObjectValue | VObjectValue[] | undefined
): string | undefined {
  const first = Array.isArray(value) ? value[0] : value
  return typeof first === 'string' ? first : undefined
}
