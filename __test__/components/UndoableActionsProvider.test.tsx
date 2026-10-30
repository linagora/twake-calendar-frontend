import {
  MAX_PENDING_ACTIONS,
  UNDO_DURATION,
  useUndoableAction
} from '@common/components/UndoableActions/UndoableActionsProvider'
import { act, fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../utils/Renderwithproviders'

const commit = jest.fn()
const undo = jest.fn()

function Scheduler() {
  const schedule = useUndoableAction()
  let count = 0
  return (
    <button
      onClick={() => {
        const name = `action${++count}`
        schedule({
          message: `${name} done`,
          commit: () => commit(name),
          undo: () => undo(name)
        })
      }}
    >
      schedule
    </button>
  )
}

const scheduleOne = () => fireEvent.click(screen.getByText('schedule'))
const wait = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms)
  })

describe('UndoableActionsProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })
  afterEach(() => jest.useRealTimers())

  it('carries the action out once the time to undo it is over', () => {
    renderWithProviders(<Scheduler />)
    scheduleOne()

    expect(screen.getByText('action1 done')).toBeInTheDocument()
    wait(UNDO_DURATION - 200)
    expect(commit).not.toHaveBeenCalled()
    wait(200)

    expect(commit).toHaveBeenCalledWith('action1')
    expect(screen.queryByText('action1 done')).not.toBeInTheDocument()
  })

  it('undoes the action instead of carrying it out', () => {
    renderWithProviders(<Scheduler />)
    scheduleOne()
    fireEvent.click(screen.getByRole('button', { name: 'actions.undo' }))
    wait(UNDO_DURATION)

    expect(undo).toHaveBeenCalledWith('action1')
    expect(commit).not.toHaveBeenCalled()
  })

  it('counts each action down on its own', () => {
    renderWithProviders(<Scheduler />)
    scheduleOne()
    wait(UNDO_DURATION / 2)
    scheduleOne()
    wait(UNDO_DURATION / 2)

    expect(commit).toHaveBeenCalledTimes(1)
    expect(commit).toHaveBeenCalledWith('action1')
    expect(screen.getByText('action2 done')).toBeInTheDocument()
  })

  it('carries the oldest action out when too many are pending', () => {
    renderWithProviders(<Scheduler />)
    for (let i = 0; i < MAX_PENDING_ACTIONS; i++) scheduleOne()
    expect(commit).not.toHaveBeenCalled()

    scheduleOne()

    expect(commit).toHaveBeenCalledTimes(1)
    expect(commit).toHaveBeenCalledWith('action1')
    expect(
      screen.getAllByRole('button', { name: 'actions.undo' })
    ).toHaveLength(MAX_PENDING_ACTIONS)
  })

  it('waits while the user points at the alert', () => {
    renderWithProviders(<Scheduler />)
    scheduleOne()
    fireEvent.mouseEnter(screen.getByText('action1 done'))
    wait(UNDO_DURATION * 2)
    expect(commit).not.toHaveBeenCalled()

    fireEvent.mouseLeave(screen.getByText('action1 done'))
    wait(UNDO_DURATION)
    expect(commit).toHaveBeenCalledWith('action1')
  })

  it('carries out what is pending when the app goes away', () => {
    const { unmount } = renderWithProviders(<Scheduler />)
    scheduleOne()
    unmount()

    expect(commit).toHaveBeenCalledWith('action1')
  })
})
