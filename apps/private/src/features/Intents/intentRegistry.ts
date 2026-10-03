import type { IntentHandlerProps } from '@common/features/Intents/types'
import type { ComponentType } from 'react'
import { IntentDayView } from './IntentDayView'

export interface IntentHandlerEntry {
  action: string
  type: string
  component: ComponentType<IntentHandlerProps>
}

/** The intents Twake Calendar serves: keep in sync with the Cozy manifest. */
export const INTENT_REGISTRY: IntentHandlerEntry[] = [
  { action: 'OPEN', type: 'io.cozy.calendar.events', component: IntentDayView }
]

export const findIntentHandler = (
  action: string,
  type: string
): IntentHandlerEntry | null =>
  INTENT_REGISTRY.find(
    entry => entry.action === action && entry.type === type
  ) ?? null
