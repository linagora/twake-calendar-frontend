import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Popover,
  TextField,
  Typography,
  useTheme
} from '@linagora/twake-mui'
import { useEffect, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { useI18n } from 'twake-i18n'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { getAccessiblePair } from '@common/utils/getAccessiblePair'
import { defaultColors } from '@common/utils/defaultColors'

export function ColorPicker({
  selectedColor,
  colors = defaultColors.slice(0, 4),
  onChange
}: {
  selectedColor: Record<string, string>
  colors?: Record<string, string>[]
  onChange: (color: Record<string, string>) => void
}): JSX.Element {
  const customColor = !colors.find(c => c.light === selectedColor?.light)
    ? selectedColor
    : undefined

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {colors.map(c => (
        <ColorBox
          key={c.light}
          color={c}
          onChange={onChange}
          selectedColor={selectedColor}
        />
      ))}
      {customColor && (
        <ColorBox
          color={customColor ?? {}}
          onChange={onChange}
          selectedColor={selectedColor}
        />
      )}

      <ColorPickerBox
        onChange={c => {
          onChange(c)
        }}
        selectedColor={selectedColor}
      />
    </Box>
  )
}

function ColorBox({
  color,
  onChange,
  selectedColor
}: {
  color: Record<string, string>
  onChange: (color: Record<string, string>) => void
  selectedColor: Record<string, string>
}): JSX.Element {
  return (
    <Box
      role="button"
      aria-label={`select color ${color.light}`}
      onClick={() => onChange(color)}
      style={{
        width: '46px',
        height: '32px',
        padding: 0,
        borderRadius: '4px',
        backgroundColor: color.light,
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <Box
        style={{
          height: '7px',
          width: '100%',
          borderRadius: '4px 4px 0px 0px',
          backgroundColor: color.dark
        }}
      ></Box>
      <CheckIcon
        style={{
          visibility:
            selectedColor?.light === color.light ? 'visible' : 'hidden',
          color: color.dark
        }}
      />
    </Box>
  )
}

function ColorPickerHeader(): JSX.Element {
  const { t } = useI18n()
  return (
    <>
      <Typography variant="subtitle1" sx={{ fontWeight: '600' }}>
        {t('colorPicker.title')}
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
        {t('colorPicker.subtitle')}
      </Typography>
    </>
  )
}

function ColorPickerFields({
  color,
  onColorChange,
  fullWidth = false
}: {
  color: Record<string, string>
  onColorChange: (c: string) => void
  fullWidth?: boolean
}): JSX.Element {
  const { t } = useI18n()
  const [draftLight, setDraftLight] = useState(color.light)

  useEffect(() => {
    const updateDraftColor = (): void => {
      setDraftLight(color.light)
    }
    updateDraftColor()
  }, [color.light])

  const commitChange = (): void => {
    onColorChange(draftLight)
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      commitChange()
    }
  }

  return (
    <>
      <Box sx={{ mb: 2 }}>
        <HexColorPicker
          color={color.light}
          onChange={onColorChange}
          style={{ width: '100%' }}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" sx={{ mr: 1 }}>
          {t('colorPicker.hex')}
        </Typography>
        <TextField
          value={draftLight?.toUpperCase()}
          onChange={e => setDraftLight(e.target.value)}
          onBlur={commitChange}
          onKeyDown={handleKeyDown}
          variant="standard"
          size="small"
          fullWidth={fullWidth}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Box>
    </>
  )
}

function ColorPickerActions({
  onCancel,
  onSave
}: {
  onCancel: () => void
  onSave: () => void
}): JSX.Element {
  const { t } = useI18n()
  return (
    <>
      <Button onClick={onCancel}>{t('common.cancel')}</Button>
      <Button
        variant="contained"
        onClick={onSave}
        sx={{ textTransform: 'none' }}
      >
        {t('actions.save')}
      </Button>
    </>
  )
}

function ColorPickerBox({
  onChange,
  selectedColor
}: {
  onChange: (color: Record<string, string>) => void
  selectedColor: Record<string, string>
}): JSX.Element {
  const { t } = useI18n()
  const [oldColor] = useState(
    selectedColor ?? { light: '#ffffff', dark: '#808080' }
  )
  const [color, setColor] = useState(oldColor)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)
  const theme = useTheme()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  const handleClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = (): void => {
    onChange(oldColor)
    setAnchorEl(null)
  }

  const handleSave = (): void => {
    onChange(color)
    setAnchorEl(null)
  }

  const handleColorChange = (c: string): void => {
    const newLight = c.trim().toUpperCase()
    if (!/^#([0-9A-F]{3}|[0-9A-F]{6})$/.test(newLight)) return

    const newColor = {
      light: newLight,
      dark: getAccessiblePair(newLight, theme)
    }
    setColor(newColor)
    onChange(newColor)
  }

  return (
    <>
      <Box
        key="colorPicker"
        role="button"
        aria-label={t('colorPicker.selectCustom')}
        onClick={handleClick}
        style={{
          width: '46px',
          height: '32px',
          padding: 0,
          borderRadius: '4px',
          border: '1px solid #CBD2E0',
          backgroundColor: '#FFF',
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <Box
          style={{
            height: '7px',
            width: '100%',
            borderRadius: '4px 4px 0px 0px',
            backgroundColor: '#CBD2E0'
          }}
        ></Box>
        <AddIcon style={{ color: '#CBD2E0' }} />
      </Box>

      {isMobile ? (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
          <DialogTitle sx={{ pb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: '600' }}>
              {t('colorPicker.title')}
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              {t('colorPicker.subtitle')}
            </Typography>
            <ColorPickerFields
              color={color}
              onColorChange={handleColorChange}
              fullWidth
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <ColorPickerActions onCancel={handleClose} onSave={handleSave} />
          </DialogActions>
        </Dialog>
      ) : (
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'center', horizontal: 'center' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            paper: {
              style: {
                padding: '24px',
                width: '294px',
                borderRadius: '8px',
                boxShadow: '0px 1px 3px #3C404326'
              }
            }
          }}
        >
          <ColorPickerHeader />
          <ColorPickerFields color={color} onColorChange={handleColorChange} />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <ColorPickerActions onCancel={handleClose} onSave={handleSave} />
          </Box>
        </Popover>
      )}
    </>
  )
}
