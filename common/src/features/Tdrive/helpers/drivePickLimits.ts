import { Attachment } from '@common/types/Attachment'

/**
 * Size constraints the Drive picker enforces on the files it lets the user
 * pick, as its `maxFileSize` and `availableSize` action options, in bytes.
 * An absent constraint is not enforced.
 */
export interface DrivePickLimits {
  maxFileSize?: number
  availableSize?: number
}

// SIZE parameter of ATTACH, in octets (RFC 8607 4.2)
const SIZE_PARAM = 'size'

const asLimit = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : undefined

const asSize = (value: unknown): number => {
  const first: unknown = Array.isArray(value) ? value[0] : value
  const size = typeof first === 'string' ? Number(first) : first
  return typeof size === 'number' && Number.isFinite(size) && size > 0
    ? size
    : 0
}

/** The size the ATTACH property declares, 0 when it declares none. */
export const attachmentSize = (attachment: Attachment): number =>
  asSize(attachment.otherParams[SIZE_PARAM])

/** The ATTACH parameters declaring a size, none for an unknown size. */
export const sizeParams = (size: number | undefined): Record<string, string> =>
  size && size > 0 ? { [SIZE_PARAM]: String(size) } : {}

/**
 * The limits of TDRIVE_MAX_FILE_SIZE (per file) and
 * TDRIVE_MAX_TOTAL_FILE_SIZE (all the files of one event), the files already
 * attached counting towards the total. Both are disabled when unset.
 *
 * The total covers every attachment of the event that declares a size, not
 * only those picked in Tdrive: an ATTACH carries no marker of its source, and
 * the limit bounds what the event links to. Attachments that declare no size,
 * e.g. added by another client, count as 0.
 */
export const drivePickLimits = (attachments: Attachment[]): DrivePickLimits => {
  const maxFileSize = asLimit(window.TDRIVE_MAX_FILE_SIZE)
  const maxTotalFileSize = asLimit(window.TDRIVE_MAX_TOTAL_FILE_SIZE)

  const limits: DrivePickLimits = {}
  if (maxFileSize !== undefined) limits.maxFileSize = maxFileSize
  if (maxTotalFileSize !== undefined) {
    const used = attachments
      .map(attachmentSize)
      .reduce((total, size) => total + size, 0)
    limits.availableSize = Math.max(0, maxTotalFileSize - used)
  }
  return limits
}
