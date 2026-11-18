/**
 * @vitest-environment jsdom
 */
import {
  attachmentSize,
  drivePickLimits,
  sizeParams
} from '@common/features/Tdrive/helpers/drivePickLimits'
import { Attachment } from '@common/types/Attachment'

const attachment = (size?: string): Attachment =>
  new Attachment(
    'https://drive.example.com/s/file',
    'application/pdf',
    'file.pdf',
    'uri',
    size === undefined ? {} : { size }
  )

describe('drivePickLimits', () => {
  afterEach(() => {
    window.TDRIVE_MAX_FILE_SIZE = undefined
    window.TDRIVE_MAX_TOTAL_FILE_SIZE = undefined
  })

  it('sets no limit by default', () => {
    expect(drivePickLimits([attachment('100')])).toEqual({})
  })

  it('limits the size of each file', () => {
    window.TDRIVE_MAX_FILE_SIZE = 1000

    expect(drivePickLimits([])).toEqual({ maxFileSize: 1000 })
  })

  it('counts the files already attached towards the total', () => {
    window.TDRIVE_MAX_TOTAL_FILE_SIZE = 1000

    expect(drivePickLimits([attachment('300'), attachment('200')])).toEqual({
      availableSize: 500
    })
  })

  it('counts attachments declaring no size as 0', () => {
    window.TDRIVE_MAX_TOTAL_FILE_SIZE = 1000

    expect(drivePickLimits([attachment(), attachment('junk')])).toEqual({
      availableSize: 1000
    })
  })

  it('leaves no room once the total is reached', () => {
    window.TDRIVE_MAX_TOTAL_FILE_SIZE = 1000

    expect(drivePickLimits([attachment('1500')])).toEqual({
      availableSize: 0
    })
  })

  it('ignores limits that are not positive numbers', () => {
    window.TDRIVE_MAX_FILE_SIZE = 0
    window.TDRIVE_MAX_TOTAL_FILE_SIZE = '1000' as unknown as number

    expect(drivePickLimits([])).toEqual({})
  })
})

describe('attachment size', () => {
  it('declares the size of a picked file', () => {
    expect(sizeParams(1234)).toEqual({ size: '1234' })
    expect(attachmentSize(attachment(sizeParams(1234).size))).toBe(1234)
  })

  it('declares no unknown size', () => {
    expect(sizeParams(undefined)).toEqual({})
    expect(sizeParams(0)).toEqual({})
  })
})
