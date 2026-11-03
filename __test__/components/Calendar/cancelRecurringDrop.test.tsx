import type { Mock } from 'vitest'
import {
  createEventHandlers,
  EventHandlersProps
} from '@common/components/Calendar/handlers/eventHandlers'
import { EditModeDialog } from '@common/components/Event/EditModeDialog'
import { fetchEvent } from '@common/features/Events/EventDao'
import { parseFetchedEvent } from '@common/features/Events/transformers'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { EventDropArg } from '@fullcalendar/core'
import { EventResizeDoneArg } from '@fullcalendar/interaction'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../utils/Renderwithproviders'

vi.mock('@common/features/Events/EventDao', () => ({
  fetchEvent: vi.fn()
}))
vi.mock('@common/features/Events/transformers', () => ({
  parseFetchedEvent: vi.fn()
}))

const calId = 'user1/cal1'

type AfterChoice = (type: 'solo' | 'all' | undefined) => Promise<void>

const occurrence = {
  uid: 'series/20261123',
  calId,
  title: 'Paris weekly',
  start: '2026-11-23',
  end: '2026-11-24',
  allday: true,
  recurrenceId: '2026-11-23'
} as CalendarEvent

function setupHandlers(): {
  handlers: ReturnType<typeof createEventHandlers>
  afterChoice: () => AfterChoice
  dispatch: Mock
} {
  ;(fetchEvent as Mock).mockResolvedValue({})
  ;(parseFetchedEvent as Mock).mockReturnValue(occurrence)
  const calendar = {
    id: calId,
    events: { [occurrence.uid]: occurrence }
  } as unknown as Calendar
  const setAfterChoiceFunc = vi.fn<void, [() => AfterChoice]>()
  const dispatch = vi.fn()

  const handlers = createEventHandlers({
    dispatch,
    calendars: { [calId]: calendar },
    setSelectedEvent: vi.fn(),
    setOpenEditModePopup: vi.fn(),
    setAfterChoiceFunc,
    timezone: 'Europe/Paris'
  } as unknown as EventHandlersProps)

  return {
    handlers,
    afterChoice: () => setAfterChoiceFunc.mock.calls[0][0](),
    dispatch
  }
}

describe('Dismissing the recurrent event dialog after a drag (#1764)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('puts a dropped occurrence back where it was', async () => {
    const { handlers, afterChoice, dispatch } = setupHandlers()
    const revert = vi.fn()

    await handlers.handleEventDrop({
      event: { extendedProps: { uid: occurrence.uid, calId } },
      delta: { years: 0, months: 0, days: 2, milliseconds: 0 },
      revert
    } as unknown as EventDropArg)
    await afterChoice()(undefined)

    expect(revert).toHaveBeenCalledTimes(1)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('puts a resized occurrence back as it was', async () => {
    const { handlers, afterChoice } = setupHandlers()
    const revert = vi.fn()

    await handlers.handleEventResize({
      event: { extendedProps: { uid: occurrence.uid, calId } },
      startDelta: { years: 0, months: 0, days: 0, milliseconds: 0 },
      endDelta: { years: 0, months: 0, days: 1, milliseconds: 0 },
      revert
    } as unknown as EventResizeDoneArg)
    await afterChoice()(undefined)

    expect(revert).toHaveBeenCalledTimes(1)
  })

  it('keeps the dropped occurrence where it is once a choice is made', async () => {
    const { handlers, afterChoice, dispatch } = setupHandlers()
    const revert = vi.fn()

    await handlers.handleEventDrop({
      event: { extendedProps: { uid: occurrence.uid, calId } },
      delta: { years: 0, months: 0, days: 2, milliseconds: 0 },
      revert
    } as unknown as EventDropArg)
    await afterChoice()('solo')

    expect(revert).not.toHaveBeenCalled()
    expect(dispatch).toHaveBeenCalled()
  })
})

describe('EditModeDialog', () => {
  function renderDialog(): {
    eventAction: Mock
    onCancel: Mock
  } {
    const eventAction = vi.fn()
    const onCancel = vi.fn()
    renderWithProviders(
      <EditModeDialog
        type="edit"
        setOpen={vi.fn()}
        eventAction={eventAction}
        onCancel={onCancel}
      />
    )
    return { eventAction, onCancel }
  }

  it('reports a cancel', () => {
    const { eventAction, onCancel } = renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(eventAction).not.toHaveBeenCalled()
  })

  it('reports Escape as a cancel', () => {
    const { onCancel } = renderDialog()

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('does not report a choice as a cancel', () => {
    const { eventAction, onCancel } = renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'common.ok' }))

    expect(eventAction).toHaveBeenCalledWith('solo')
    expect(onCancel).not.toHaveBeenCalled()
  })
})
