import { useResponsiveInputSize } from '@common/hooks/useResponsiveInputSize'
import { Attachment } from '@common/types/Attachment'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { Box, TextField } from '@linagora/twake-mui'
import { Notes as NotesIcon } from '@mui/icons-material'
import React from 'react'
import { useI18n } from 'twake-i18n'
import { FieldWithLabel } from './components/FieldWithLabel'
import { SectionPreviewRow } from './components/SectionPreviewRow'
import { AttachmentField } from './fields/AttachmentField'

export function AddDescButton({
  showDescription,
  setShowDescription,
  showMore,
  description,
  setDescription,
  attachments,
  setAttachments
}: {
  showDescription: boolean
  setShowDescription: (b: boolean) => void
  showMore: boolean
  description: string
  setDescription: (d: string) => void
  attachments: Attachment[]
  setAttachments: (attachments: Attachment[]) => void
}): JSX.Element {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()
  const inputSize = useResponsiveInputSize()
  const descriptionInputRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (showDescription) {
      descriptionInputRef.current?.focus()
    }
  }, [showDescription])

  const descriptionField = (
    <FieldWithLabel
      label={t('event.form.description')}
      isExpanded={showMore && !isMobile}
      sx={{ padding: 0, margin: 0 }}
    >
      <Box>
        <TextField
          fullWidth
          label=""
          inputRef={descriptionInputRef}
          placeholder={t('event.form.descriptionPlaceholder')}
          value={description}
          onChange={e => setDescription(e.target.value)}
          size={inputSize}
          margin="dense"
          multiline
          minRows={2}
          maxRows={10}
          slotProps={{
            input: {
              'aria-label': t('event.form.description')
            }
          }}
          sx={{
            '& .MuiInputBase-root': {
              maxHeight: '33%',
              overflowY: 'auto',
              padding: 0
            },
            '& textarea': {
              resize: 'vertical'
            }
          }}
        />
        <AttachmentField
          attachments={attachments}
          setAttachments={setAttachments}
        />
      </Box>
    </FieldWithLabel>
  )

  if (showMore) {
    return descriptionField
  }

  return (
    <>
      {!showDescription && (
        <>
          <FieldWithLabel label="" isExpanded={showMore}>
            <SectionPreviewRow
              icon={<NotesIcon />}
              onClick={() => setShowDescription(true)}
            >
              {t('event.form.addDescription')}
            </SectionPreviewRow>
          </FieldWithLabel>
          <AttachmentField
            attachments={attachments}
            setAttachments={setAttachments}
          />
        </>
      )}
      {showDescription && descriptionField}
    </>
  )
}
