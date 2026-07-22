import { AttachementPreview } from '@common/components/EventPreview/AttachementPreview'
import { Attachment } from '@common/types/Attachment'
import { render, screen } from '@testing-library/react'
import React from 'react'

jest.mock('twake-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

jest.mock(
  '@common/components/EventPreview/AttachementPreview/AttachementChip',
  () => ({
    AttachementChip: ({
      attachment
    }: {
      attachment: { x_filename?: string; uri: string }
    }) => (
      <div data-testid="chip">{attachment.x_filename ?? attachment.uri}</div>
    )
  })
)

describe('AttachementPreview', () => {
  it('filters out attachments rendered without a filename', () => {
    render(
      <AttachementPreview
        attachments={[
          new Attachment('https://example.com/doc.pdf', undefined, 'doc.pdf'),
          new Attachment('CID:664DD99135B2AF428B97493A660B458C@ugap.fr')
        ]}
      />
    )

    const chips = screen.getAllByTestId('chip')
    expect(chips).toHaveLength(1)
    expect(chips[0]).toHaveTextContent('doc.pdf')
  })

  it('renders nothing when no attachment has a filename', () => {
    const { container } = render(
      <AttachementPreview
        attachments={[
          new Attachment('CID:664DD99135B2AF428B97493A660B458C@ugap.fr'),
          new Attachment('CID:other@ugap.fr', undefined, '   ')
        ]}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })
})
