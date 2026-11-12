import { AttachementChip } from '@common/components/EventPreview/AttachementPreview/AttachementChip'
import { Attachment } from '@common/types/Attachment'
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

describe('AttachementChip', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens the link of a URI attachment', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    render(
      <AttachementChip
        attachment={
          new Attachment('https://example.com/a.pdf', undefined, 'a.pdf')
        }
      />
    )

    fireEvent.click(screen.getByText('a'))

    expect(open).toHaveBeenCalledWith(
      'https://example.com/a.pdf',
      '_blank',
      'noopener noreferrer'
    )
  })

  it('does not offer the base64 content of an inline attachment as a link', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    render(
      <AttachementChip
        attachment={Attachment.fromJcal(
          { 'x-filename': 'a.txt', encoding: 'BASE64' },
          'binary',
          'SGVsbG8gd29ybGQ='
        )}
      />
    )

    fireEvent.click(screen.getByText('a'))

    expect(open).not.toHaveBeenCalled()
  })
})
