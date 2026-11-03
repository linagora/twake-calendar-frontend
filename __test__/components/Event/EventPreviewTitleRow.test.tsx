import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { EventPreviewTitleRow } from '@common/components/EventPreview/EventPreviewTitleRow'
import { CalendarEvent } from '@common/types/EventsTypes'

vi.mock('@common/components/EventPreview/EventTimeSubtitle', () => ({
  EventTimeSubtitle: (): null => null
}))

describe('EventPreviewTitleRow', () => {
  it('lets a long unbroken title word wrap inside the dialog width', () => {
    const title = `Long title ${'x'.repeat(240)} END5`
    const event = {
      uid: 'uid',
      calId: 'cal',
      URL: '',
      title,
      start: '2026-10-16T10:00:00Z',
      end: '2026-10-16T11:00:00Z'
    } as CalendarEvent

    render(
      <EventPreviewTitleRow
        event={event}
        isOwn
        timezone="UTC"
        t={(key: string) => key}
      />
    )

    expect(screen.getByRole('heading', { name: title })).toHaveStyle({
      minWidth: '0',
      overflowWrap: 'anywhere'
    })
  })
})
