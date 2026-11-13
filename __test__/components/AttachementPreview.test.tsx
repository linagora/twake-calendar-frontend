import { AttachementPreview } from '@common/components/EventPreview/AttachementPreview'
import { Attachment } from '@common/types/Attachment'
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('twake-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

vi.mock(
  '@common/components/EventPreview/AttachementPreview/AttachementChip',
  () => ({
    AttachementChip: ({
      attachment,
      isOrganizer
    }: {
      attachment: { x_filename?: string; uri: string }
      isOrganizer?: boolean
    }) => (
      <div data-testid="chip" data-organizer={String(isOrganizer)}>
        {attachment.x_filename ?? attachment.uri}
      </div>
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

  it.each([true, false])(
    'passes organizer status %s to collapsed and expanded attachments',
    isOrganizer => {
      render(
        <AttachementPreview
          isOrganizer={isOrganizer}
          attachments={[
            new Attachment(
              'https://example.com/one.pdf',
              'application/pdf',
              'one.pdf'
            ),
            new Attachment(
              'https://example.com/two.pdf',
              'application/pdf',
              'two.pdf'
            ),
            new Attachment(
              'https://example.com/three.pdf',
              'application/pdf',
              'three.pdf'
            )
          ]}
        />
      )
      fireEvent.click(
        screen.getByRole('button', { name: 'eventPreview.showMore' })
      )
      const chips = screen.getAllByTestId('chip')
      expect(chips).toHaveLength(3)
      chips.forEach(chip =>
        expect(chip).toHaveAttribute('data-organizer', String(isOrganizer))
      )
    }
  )

  it('places the Show less button after all expanded attachment chips', () => {
    render(
      <AttachementPreview
        attachments={[
          new Attachment(
            'https://example.com/one.pdf',
            'application/pdf',
            'one.pdf'
          ),
          new Attachment(
            'https://example.com/two.pdf',
            'application/pdf',
            'two.pdf'
          ),
          new Attachment(
            'https://example.com/three.pdf',
            'application/pdf',
            'three.pdf'
          )
        ]}
      />
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'eventPreview.showMore' })
    )

    const chips = screen.getAllByTestId('chip')
    const showLessButton = screen.getByRole('button', {
      name: 'eventPreview.showLess'
    })
    const lastChip = chips[chips.length - 1]
    expect(
      lastChip.compareDocumentPosition(showLessButton) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })
})
