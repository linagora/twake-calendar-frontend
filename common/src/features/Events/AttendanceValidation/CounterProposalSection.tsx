import type { JSX } from 'react'
import { Button } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'

interface CounterProposalSectionProps {
  isOrganizer: boolean
  onToggle: () => void
}

export function CounterProposalSection({
  isOrganizer,
  onToggle
}: CounterProposalSectionProps): JSX.Element | null {
  const { t } = useI18n()
  if (isOrganizer) {
    return null
  }

  return (
    <Button
      variant="text"
      size="small"
      onClick={onToggle}
      sx={{ marginLeft: 1, textTransform: 'none' }}
    >
      {t('eventPreview.proposeNewTime')}
    </Button>
  )
}
