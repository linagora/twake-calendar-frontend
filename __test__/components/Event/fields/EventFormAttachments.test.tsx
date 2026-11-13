import { DEFAULT_FORM_VALUES } from '@common/components/Event/EventFormFields.types'
import { EventFormAttachments } from '@common/components/Event/fields/EventFormAttachments'
import type { TdriveFile } from '@common/features/Tdrive/types'
import { Attachment } from '@common/types/Attachment'
import { render } from '@testing-library/react'

const picker = vi.hoisted(() => ({
  onFilesSelected: null as ((files: TdriveFile[]) => void) | null
}))

// The picker keeps the callback it was opened with until the user picks
vi.mock('@common/features/Tdrive/components/TdriveButton', () => ({
  TdriveButton: ({
    onFilesSelected
  }: {
    onFilesSelected: (files: TdriveFile[]) => void
  }) => {
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
  })
})
