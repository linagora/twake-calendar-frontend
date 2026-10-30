import { ActionAlert } from '@common/components/Loading/SnackBarAlert'
import { Box } from '@linagora/twake-mui'
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'
import { useI18n } from 'twake-i18n'

// How long the user has to undo an action before it is carried out
export const UNDO_DURATION = 3000
// A further action carries out the oldest one at once
export const MAX_PENDING_ACTIONS = 3

export interface UndoableAction {
  message: string
  // Carries the action out, once the time to undo it is over
  commit: () => unknown
  // Puts things back as they were: nothing has been sent yet
  undo: () => void
}

type ScheduleUndoableAction = (action: UndoableAction) => void

// Without a provider there is no way to undo: carry the action out at once
const UndoableActionsContext = createContext<ScheduleUndoableAction>(
  action => void action.commit()
)

export const useUndoableAction = (): ScheduleUndoableAction =>
  useContext(UndoableActionsContext)

interface PendingAction extends UndoableAction {
  id: number
}

export function UndoableActionsProvider({
  children
}: PropsWithChildren): JSX.Element {
  const [pending, setPending] = useState<PendingAction[]>([])
  // Mirrors the state, so that an action is settled once and only once
  const pendingRef = useRef<PendingAction[]>([])
  const nextId = useRef(0)

  const settle = useCallback((id: number, undo: boolean): void => {
    const action = pendingRef.current.find(a => a.id === id)
    if (!action) return
    pendingRef.current = pendingRef.current.filter(a => a.id !== id)
    setPending(pendingRef.current)
    if (undo) action.undo()
    else void action.commit()
  }, [])

  const schedule = useCallback<ScheduleUndoableAction>(
    action => {
      if (pendingRef.current.length >= MAX_PENDING_ACTIONS) {
        settle(pendingRef.current[0].id, false)
      }
      pendingRef.current = [
        ...pendingRef.current,
        { ...action, id: ++nextId.current }
      ]
      setPending(pendingRef.current)
    },
    [settle]
  )

  // Leaving the app carries out what is still pending
  useEffect(
    () => (): void => pendingRef.current.forEach(a => settle(a.id, false)),
    [settle]
  )

  return (
    <UndoableActionsContext.Provider value={schedule}>
      {children}
      {pending.length > 0 && (
        <Box
          sx={{
            position: 'fixed',
            bottom: { xs: 8, sm: 24 },
            left: { xs: 8, sm: '50%' },
            right: { xs: 8, sm: 'auto' },
            transform: { sm: 'translateX(-50%)' },
            zIndex: theme => theme.zIndex.snackbar,
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          {pending.map(action => (
            <PendingActionAlert
              key={action.id}
              message={action.message}
              onTimeout={() => settle(action.id, false)}
              onUndo={() => settle(action.id, true)}
            />
          ))}
        </Box>
      )}
    </UndoableActionsContext.Provider>
  )
}

function PendingActionAlert({
  message,
  onTimeout,
  onUndo
}: {
  message: string
  onTimeout: () => void
  onUndo: () => void
}): JSX.Element {
  const { t } = useI18n()
  // The countdown waits while the user points at or tabs into the alert
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const paused = hovered || focused
  const remaining = useRef(UNDO_DURATION)

  // settling twice does nothing: a new onTimeout may restart this freely
  useEffect(() => {
    if (paused) return
    const startedAt = Date.now()
    const timer = setTimeout(onTimeout, remaining.current)
    return (): void => {
      clearTimeout(timer)
      remaining.current -= Date.now() - startedAt
    }
  }, [paused, onTimeout])

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <ActionAlert
        message={message}
        action={{ label: t('actions.undo'), onClick: onUndo }}
      />
    </Box>
  )
}
