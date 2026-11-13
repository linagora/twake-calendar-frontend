<<<<<<< HEAD
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

=======
import { DEFAULT_FORM_VALUES } from '@common/components/Event/EventFormFields.types'
import { EventFormAttachments } from '@common/components/Event/fields/EventFormAttachments'
import type { TdriveFile } from '@common/features/Tdrive/types'
import { Attachment } from '@common/types/Attachment'
import { render } from '@testing-library/react'

const picker = vi.hoisted(() => ({
  onFilesSelected: null as ((files: TdriveFile[]) => void) | null
}))

// The picker keeps the callback it was opened with until the user picks
>>>>>>> 5c07450c (fixup! [#2031] added dnd zone in attachment and api call)
vi.mock('@common/features/Tdrive/components/TdriveButton', () => ({
  TdriveButton: ({
    onFilesSelected
  }: {
    onFilesSelected: (files: TdriveFile[]) => void
  }) => {
<<<<<<< HEAD
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
=======
    picker.onFilesSelected ??= onFilesSelected
    return null
  }
}))
vi.mock('@common/app/hooks', () => ({
  useAppSelector: () => 'https://alice.example.com'
}))
vi.mock('twake-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

describe('EventFormAttachments', () => {
  beforeEach(() => {
    picker.onFilesSelected = null
    window.TDRIVE_ENABLED = true
  })

  afterEach(() => {
    window.TDRIVE_ENABLED = undefined
  })

  it('keeps the attachments uploaded while the Drive picker was open', () => {
    const existing = new Attachment('https://drive.example.com/a', '', 'a.pdf')
    const uploaded = new Attachment('https://drive.example.com/b', '', 'b.pdf')
    const setAttachments = vi.fn()
    const renderField = (attachments: Attachment[]) => (
      <EventFormAttachments
        v={{ ...DEFAULT_FORM_VALUES, attachments }}
        setAttachments={setAttachments}
        showMore
        isExpanded
      />
    )
    const { rerender } = render(renderField([existing]))

    // An upload finishes while the picker is open
    rerender(renderField([existing, uploaded]))
    picker.onFilesSelected?.([
      { url: 'https://drive.example.com/c', name: 'c.pdf' } as TdriveFile
    ])

    expect(setAttachments).toHaveBeenCalledWith([
      existing,
      uploaded,
      expect.objectContaining({ uri: 'https://drive.example.com/c' })
    ])
>>>>>>> 5c07450c (fixup! [#2031] added dnd zone in attachment and api call)
  })
})
