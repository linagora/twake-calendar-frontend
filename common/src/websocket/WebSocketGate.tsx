import type { JSX } from 'react'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { api } from '@common/utils/apiUtils'
import { useI18n } from 'twake-i18n'
import { useCalendarMessageHandler } from './hooks/useCalendarMessageHandler'
import { useCalendarRegistrationPaths } from './hooks/useCalendarRegistrationPaths'
import { useWebSocketConnection } from '@linagora/twake-websocket'
import { useWebSocketRegistrations } from './hooks/useWebSocketRegistrations'

import { ImportResult } from './messaging'
import { WebSocketStatusSnackbar } from './WebSocketStatusSnackbar'

export function WebSocketGate(): JSX.Element | null {
  const { t } = useI18n()

  const dispatch = useAppDispatch()
  const isAuthenticated = useAppSelector(state =>
    Boolean(state.user.userData && state.user.tokens)
  )
  const isPending = useAppSelector(state => state.calendars.pending)

  const { calendarList, tempCalendarList } = useCalendarRegistrationPaths()
  const messageHandler = useCalendarMessageHandler(dispatch)

  const connection = useWebSocketConnection({
    enabled: isAuthenticated,
    url: window.WEBSOCKET_URL ?? window.CALENDAR_BASE_URL,
    api,
    onMessage: messageHandler.onMessage,
    onDisconnect: messageHandler.dispose,
    exposeOnWindow: true
  })

  useWebSocketRegistrations(connection, calendarList, { enabled: !isPending })
  useWebSocketRegistrations(connection, tempCalendarList)

  const currentImport = messageHandler.importResults[0]

  return (
    <>
      {connection.error && (
        <WebSocketStatusSnackbar
          severity="error"
          onClose={connection.clearError}
          message={t('websocket.error', {
            error:
              (connection.error as ErrorEvent)?.message ??
              connection.error?.type ??
              'unknown'
          })}
        />
      )}
      {currentImport && (
        <WebSocketStatusSnackbar
          message={importResultMessage(currentImport, t)}
          severity={importResultSeverity(currentImport)}
          onClose={messageHandler.shiftImportResult}
        />
      )}
    </>
  )
}

function importResultMessage(
  result: ImportResult,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  if (result.status === 'failed') {
    return t('websocket.importFailed')
  }
  return t('websocket.importCompleted', {
    imported: t('websocket.importedItems', {
      smart_count: result.succeedCount
    }),
    errors: t('websocket.importErrors', { smart_count: result.failedCount })
  })
}

function importResultSeverity(
  result: ImportResult
): 'success' | 'warning' | 'error' {
  if (result.status === 'failed') return 'error'
  return result.failedCount > 0 ? 'warning' : 'success'
}
