import {
  Box,
  Button,
  FormControl,
  TextField,
  Typography
} from '@linagora/twake-mui'
import React, { useEffect, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { SettingsTab } from './SettingsTab'
import { CalendarSelector } from './CalendarSelector'
import { useResponsiveInputSize } from '@/hooks/useResponsiveInputSize'

export const ImportTab: React.FC<{
  userId: string
  importTarget: string
  setImportTarget: (target: string) => void
  setImportedContent: (content: File | null) => void
  newCalParams: {
    name: string
    setName: (name: string) => void
    description: string
    setDescription: (d: string) => void
    color: Record<string, string>
    setColor: (color: Record<string, string>) => void
    visibility: 'public' | 'private'
    setVisibility: (visibility: 'public' | 'private') => void
  }
}> = ({
  userId,
  importTarget,
  setImportTarget,
  setImportedContent,
  newCalParams
}) => {
  const { t } = useI18n()
  const inputSize = useResponsiveInputSize()

  const [importMode] = useState<'file' | 'url'>('file')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importUrl, setImportUrl] = useState('')

  useEffect(() => {
    setImportedContent(importMode === 'file' ? importFile : null)
  }, [importFile, importUrl, importMode, setImportedContent])

  return (
    <>
      {/* Form group 1: Select file button - first group, margin top 0 */}
      {importMode === 'file' && (
        <Box mt={0}>
          <Button
            variant="outlined"
            component="label"
            size="medium"
            sx={{ borderRadius: '12px' }}
          >
            {t('common.select_file')}
            <input
              type="file"
              hidden
              accept=".ics"
              onChange={e => setImportFile(e.target.files?.[0] ?? null)}
            />
          </Button>
          {importFile && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ marginTop: '6px' }}
            >
              {importFile.name}
            </Typography>
          )}
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ marginTop: '6px' }}
          >
            {t('calendar.import_file_description')}
          </Typography>
        </Box>
      )}

      {/* Form group 2: URL field */}
      {importMode === 'url' && (
        <Box mt={0}>
          <TextField
            fullWidth
            label={t('calendar.ics_feed_url')}
            value={importUrl}
            onChange={e => setImportUrl(e.target.value)}
            size={inputSize}
            margin="dense"
            sx={{
              '&.MuiFormControl-root.MuiFormControl-marginDense': {
                marginTop: '6px',
                marginBottom: 0
              }
            }}
          />
        </Box>
      )}

      {/* Form group 3: Import to */}
      <Box mt={2}>
        <FormControl
          fullWidth
          size="small"
          margin="dense"
          sx={{
            '&.MuiFormControl-root.MuiFormControl-marginDense': {
              marginTop: '6px',
              marginBottom: 0
            }
          }}
        >
          <CalendarSelector
            userId={userId}
            importTarget={importTarget}
            setImportTarget={setImportTarget}
          />
        </FormControl>
      </Box>

      {/* Form group 4: SettingsTab (when importing to new calendar) */}
      {importTarget === 'new' && (
        <Box mt={2}>
          <SettingsTab {...newCalParams} />
        </Box>
      )}
    </>
  )
}
