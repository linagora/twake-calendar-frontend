import { Box, Button, Stack, Typography } from '@linagora/twake-mui'
import type { IntentServiceAPI } from 'cozy-interapp'
import type { JSX, ReactNode } from 'react'
import { useCallback, useEffect, useRef } from 'react'
import { useI18n } from 'twake-i18n'
import { failIntent, type IntentServiceError } from './useIntentService'

/** What the page says when it cannot serve the intent */
export type IntentMessage =
  IntentServiceError | 'sessionExpired' | 'unsupported' | 'invalidData'

/**
 * Why the intent cannot be served, as the whole page of the frame: the app
 * that framed it keeps its own close button. Used by IntentsApp, IntentPage
 * and RejectedIntent.
 */
export function IntentMessageScreen({
  message
}: {
  message: IntentMessage
}): JSX.Element {
  const { t } = useI18n()
  return (
    <Stack
      component="main"
      spacing={1}
      sx={{
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        p: 3,
        textAlign: 'center'
      }}
    >
      <Typography variant="h5" component="h1">
        {t(`intents.${message}.title`)}
      </Typography>
      <Typography>{t(`intents.${message}.description`)}</Typography>
    </Stack>
  )
}

export interface RejectedIntentProps {
  service: IntentServiceAPI
  message: IntentMessage
  /** What the client gets */
  error: string
}

/**
 * Tells the client the intent fails, and the user why. In an Effect, as it
 * talks to the page around; the ref keeps it to once. Used by IntentPage and
 * OpenEventIntentPage.
 */
export function RejectedIntent({
  service,
  message,
  error
}: RejectedIntentProps): JSX.Element {
  const answeredRef = useRef(false)

  useEffect(() => {
    if (answeredRef.current) return
    answeredRef.current = true
    failIntent(service, new Error(error))
  }, [service, error])

  return <IntentMessageScreen message={message} />
}

/**
 * Answers the client once: the result, or null (cancelled). cozy-interapp
 * throws on a second answer; the ref drops it. Used by NewEventIntentPage
 * and OpenEventIntentPage.
 */
export function useSettle<Result>(
  service: IntentServiceAPI
): (result: Result | null) => void {
  const settledRef = useRef(false)
  return useCallback(
    result => {
      if (settledRef.current) return
      settledRef.current = true
      if (result === null) service.cancel()
      else service.terminate(result)
    },
    [service]
  )
}

/**
 * Once something is shown, tells the client the service is ready to use and
 * hides its close button: every page of an intent has its own. In an
 * Effect, as it talks to the page around; the ref keeps it to once, under
 * StrictMode too (cozy-interapp throws on a second call). Used by
 * NewEventIntentPage and OpenEventIntentPage.
 */
export function useNotifyShown(
  service: IntentServiceAPI,
  isShown: boolean
): void {
  const notifiedRef = useRef(false)
  useEffect(() => {
    if (!isShown || notifiedRef.current) return
    notifiedRef.current = true
    service.notifyReadyToUse()
    service.hideCross()
  }, [service, isShown])
}

/**
 * The width of the form and of the preview in their own dialog of the
 * calendar (`normalMaxWidth` of ResponsiveDialog): the dialog of the client
 * keeps the width the page asks for
 */
const INTENT_WIDTH = 570

/**
 * What the page of an intent shows, as the page itself: the `main` landmark,
 * laid out at INTENT_WIDTH, never a dialog of its own (the client draws
 * the dialog around the frame). A ResizeObserver asks the client for the
 * height of the content (cozy-interapp's resizeClient) when it shows and
 * each time it changes, so that the dialog of the client fits it. Its height
 * is that of its content: cozy-interapp stretches `html` and `body` to the
 * frame, which would never let the dialog shrink. Used by NewEventIntentPage
 * and OpenEventIntentPage.
 */
export function IntentFrame({
  service,
  children
}: {
  service: IntentServiceAPI
  children: ReactNode
}): JSX.Element {
  const askedHeightRef = useRef<number | null>(null)
  // A callback ref, whose cleanup stops observing (React 19)
  const observe = useCallback(
    (main: HTMLElement | null) => {
      if (!main) return
      const observer = new ResizeObserver(() => {
        const height = Math.ceil(main.getBoundingClientRect().height)
        if (height === askedHeightRef.current) return
        askedHeightRef.current = height
        try {
          service.resizeClient({ width: INTENT_WIDTH, height })
        } catch {
          // The client has its answer (cozy-interapp throws after it) and
          // closes the frame on its own time: nothing more to ask
          observer.disconnect()
        }
      })
      observer.observe(main)
      return (): void => observer.disconnect()
    },
    [service]
  )
  return (
    // flow-root: the margins of the content count in its height
    <Box
      component="main"
      ref={observe}
      sx={{ display: 'flow-root', maxWidth: INTENT_WIDTH }}
    >
      {children}
    </Box>
  )
}

/**
 * A message the user reads, then closes: the intent then ends (onClose).
 * Used by NewEventIntentPage (no calendar to save into) and
 * OpenEventIntentPage (no such event).
 */
export function ClosableMessage({
  text,
  onClose
}: {
  text: string
  onClose: () => void
}): JSX.Element {
  const { t } = useI18n()
  return (
    <Stack spacing={2} sx={{ alignItems: 'center', p: 3 }}>
      <Typography>{text}</Typography>
      <Button variant="contained" onClick={onClose}>
        {t('actions.close')}
      </Button>
    </Stack>
  )
}
