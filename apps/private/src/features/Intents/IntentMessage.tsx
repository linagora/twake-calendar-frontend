import type { IntentMessageReason } from '@common/features/Intents/types'
import { Typography } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'

interface IntentMessageProps {
  reason: IntentMessageReason
}

/** Why this frame cannot serve the intent, for the person looking at it. */
export function IntentMessage({ reason }: IntentMessageProps): JSX.Element {
  const { t } = useI18n()

  return (
    <div className="intent-message" data-testid="intent-message">
      <Typography>{t(`intents.error.${reason}`)}</Typography>
    </div>
  )
}
