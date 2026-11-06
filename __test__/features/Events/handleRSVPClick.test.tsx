import type { AppDispatch } from '@common/app/store'
import { handleRSVP } from '@common/components/Event/eventHandlers/eventHandlers'
import { setCalendarError } from '@common/features/Calendars/CalendarSlice'
import { handleRSVPClick } from '@common/features/Events/AttendanceValidation/handleRSVPClick'
import { participationUpdated } from '@common/features/Events/eventSaveFeedbackSlice'
import type { ContextualizedEvent } from '@common/types/EventsTypes'
import type { MockInstance } from 'vitest'

vi.mock('@common/components/Event/eventHandlers/eventHandlers', () => ({
  handleRSVP: vi.fn()
}))

const failedAlert = setCalendarError(
  'TRANSLATION:error.participationUpdateFailed'
)

describe('handleRSVPClick', () => {
  const dispatch = vi.fn()
  const onLoadingChange = vi.fn()
  const setAfterChoiceFunc = vi.fn()
  const setOpenEditModePopup = vi.fn()
  let consoleError: MockInstance

  const click = (isRecurring: boolean): Promise<void> =>
    handleRSVPClick(
      'ACCEPTED',
      { isRecurring, calendar: {}, event: {} } as ContextualizedEvent,
      undefined,
      setAfterChoiceFunc,
      setOpenEditModePopup,
      dispatch as unknown as AppDispatch,
      onLoadingChange
    )

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(handleRSVP).mockResolvedValue(undefined)
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    consoleError.mockRestore()
  })

  it('confirms an updated participation', async () => {
    await click(false)
    expect(dispatch).toHaveBeenCalledWith(participationUpdated('ACCEPTED'))
    expect(dispatch).not.toHaveBeenCalledWith(failedAlert)
    expect(onLoadingChange).toHaveBeenCalledWith(false)
  })

  it('reports a failed update instead of confirming it', async () => {
    vi.mocked(handleRSVP).mockRejectedValue(new Error('refused'))
    await click(false)
    expect(dispatch).toHaveBeenCalledWith(failedAlert)
    expect(dispatch).not.toHaveBeenCalledWith(participationUpdated('ACCEPTED'))
    expect(onLoadingChange).toHaveBeenCalledWith(false)
  })

  it('confirms a recurring update once the scope is chosen', async () => {
    await click(true)
    expect(handleRSVP).not.toHaveBeenCalled()
    expect(dispatch).not.toHaveBeenCalled()

    const afterChoice = setAfterChoiceFunc.mock.calls[0][0]()
    await afterChoice('all')
    expect(vi.mocked(handleRSVP).mock.calls[0][0]).toMatchObject({
      typeOfAction: 'all'
    })
    expect(dispatch).toHaveBeenCalledWith(participationUpdated('ACCEPTED'))
  })

  it('stays silent when the recurring scope dialog is cancelled', async () => {
    await click(true)
    await setAfterChoiceFunc.mock.calls[0][0]()(undefined)
    expect(handleRSVP).not.toHaveBeenCalled()
    expect(dispatch).not.toHaveBeenCalled()
  })
})
