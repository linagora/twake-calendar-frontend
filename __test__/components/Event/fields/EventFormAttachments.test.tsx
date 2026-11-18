/**
 * @vitest-environment jsdom
 */
import React from 'react'
import { render } from '@testing-library/react'
import { EventFormAttachments } from '@common/components/Event/fields/EventFormAttachments'
import { DEFAULT_FORM_VALUES } from '@common/components/Event/EventFormFields.types'
import { drivePickLimits } from '@common/features/Tdrive/helpers/drivePickLimits'
import { TdriveFile } from '@common/features/Tdrive/types'
import { Attachment } from '@common/types/Attachment'

vi.mock('twake-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

vi.mock('@common/app/hooks', () => ({
  useAppSelector: () => 'https://drive.example.com'
}))

vi.mock('@common/features/Tdrive/helpers/isTdrivePickerAvailable', () => ({
  isTdrivePickerAvailable: () => true
}))

let pickFiles: (files: TdriveFile[]) => void = () => undefined

vi.mock('@common/features/Tdrive/components/TdriveButton', () => ({
  TdriveButton: ({
    onFilesSelected
  }: {
    onFilesSelected: (files: TdriveFile[]) => void
  }) => {
    pickFiles = onFilesSelected
    return null
  }
}))

const pickedFile: TdriveFile = {
  id: 'file-id',
  name: 'report.pdf',
  url: 'https://drive.example.com/s/report',
  type: 'sharingLink',
  mimeType: 'application/pdf',
  size: 4096
}

const pickAndAttach = (file: TdriveFile): Attachment[] => {
  const setAttachments = vi.fn()
  render(
    <EventFormAttachments
      v={{ ...DEFAULT_FORM_VALUES, attachments: [] }}
      setAttachments={setAttachments}
      showMore={false}
      isExpanded={false}
    />
  )
  pickFiles([file])
  return setAttachments.mock.calls[0][0] as Attachment[]
}

describe('EventFormAttachments', () => {
  afterEach(() => {
    window.TDRIVE_MAX_TOTAL_FILE_SIZE = undefined
  })

  it('records the size of a picked file on its attachment', () => {
    const [attachment] = pickAndAttach(pickedFile)

    expect(attachment.uri).toBe(pickedFile.url)
    expect(attachment.otherParams).toEqual({ size: '4096' })
  })

  it('counts a picked file towards the room left for the next pick', () => {
    window.TDRIVE_MAX_TOTAL_FILE_SIZE = 5000

    expect(drivePickLimits(pickAndAttach(pickedFile))).toEqual({
      availableSize: 904
    })
  })

  it('declares no size for a file the picker reports none for', () => {
    const [attachment] = pickAndAttach({ ...pickedFile, size: undefined })

    expect(attachment.otherParams).toEqual({})
  })
})
