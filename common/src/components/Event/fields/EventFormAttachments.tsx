import React, { useCallback } from 'react'
import { useI18n } from 'twake-i18n'
import { TdriveButton } from '@common/features/Tdrive/components/TdriveButton'
import { useAppSelector } from '@common/app/hooks'
import { selectPlatformURL } from '@common/app/selectors/selectPlatformURL'
import { isTdrivePickerAvailable } from '@common/features/Tdrive/helpers/isTdrivePickerAvailable'
import { TdriveFile } from '@common/features/Tdrive/types'
import { Attachment } from '@common/types/Attachment'
import { isSafeHttpUrl } from '@common/utils/isSafeUrl'
import { EventFormValues } from '../EventFormFields.types'
import { AttachmentField } from './AttachmentField'
import { FieldWithLabel } from '../components/FieldWithLabel'

const showInputLabel = (showMore: boolean, label: string): string =>
  showMore ? label : ''

export const EventFormAttachments: React.FC<{
  v: EventFormValues
  setAttachments: (v: Attachment[]) => void
  showMore: boolean
  isExpanded: boolean
}> = ({ v, setAttachments, showMore, isExpanded }) => {
  const { t } = useI18n()
  const platformURL = useAppSelector(selectPlatformURL)
  const hasVisibleAttachments = v.attachments.some(a => isSafeHttpUrl(a.uri))

  const handleTdriveFilesSelected = useCallback(
    (files: TdriveFile[]): void => {
      const attachments = files.map(
        file => new Attachment(file.url, file.mimeType ?? undefined, file.name)
      )
      setAttachments([...v.attachments, ...attachments])
    },
    [v.attachments, setAttachments]
  )

  if (isTdrivePickerAvailable(platformURL)) {
    return (
      <TdriveButton
        onFilesSelected={handleTdriveFilesSelected}
        showMore={showMore}
        attachments={v.attachments}
        setAttachments={setAttachments}
      />
    )
  }

  if (hasVisibleAttachments) {
    return (
      <FieldWithLabel
        label={showInputLabel(showMore, t('event.form.tdriveFiles'))}
        isExpanded={isExpanded}
      >
        <AttachmentField
          attachments={v.attachments}
          setAttachments={setAttachments}
        />
      </FieldWithLabel>
    )
  }

  return null
}
