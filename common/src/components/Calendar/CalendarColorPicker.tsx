import type { JSX } from 'react'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Popover,
  TextField,
  Typography,
  useTheme
} from '@linagora/twake-mui'
import { Dialog } from '@common/ds/Dialog/Dialog'
import { useEffect, useRef, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { useI18n } from 'twake-i18n'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { getAccessiblePair } from '@common/utils/getAccessiblePair'
import { defaultColors } from '@common/utils/defaultColors'
import { expandHexColor } from '@common/utils/expandHexColor'

const swatchFocusSx = {
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: 'primary.main',
    outlineOffset: '2px'
  }
}

export function ColorPicker({
  selectedColor,
  colors = defaultColors.slice(0, 4),
  onChange,
  label
}: {
  selectedColor: Record<string, string>
  colors?: Record<string, string>[]
  onChange: (color: Record<string, string>) => void
  label?: string
}): JSX.Element {
  const { t } = useI18n()
  const swatchRefs = useRef<(HTMLDivElement | null)[]>([])
  const customColor = !colors.find(c => c.light === selectedColor?.light)
    ? selectedColor
    : undefined
  const swatches = customColor ? [...colors, customColor] : colors
  const checkedIndex = swatches.findIndex(c => c.light === selectedColor?.light)
  // Roving tabindex: Tab stops once on the group, the arrows move inside it
  const focusableIndex = Math.max(checkedIndex, 0)

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    index: number
  ): void => {
    const step =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0
    if (step === 0 && e.key !== ' ') return
    e.preventDefault()
    const next = (index + step + swatches.length) % swatches.length
    onChange(swatches[next])
    swatchRefs.current[next]?.focus()
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
        role="radiogroup"
        aria-label={label ?? t('calendar.color')}
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        {swatches.map((c, index) => (
          <ColorBox
            key={c.light ?? 'custom'}
            boxRef={el => {
              swatchRefs.current[index] = el
            }}
            color={c}
            checked={index === checkedIndex}
            tabIndex={index === focusableIndex ? 0 : -1}
            onKeyDown={e => handleKeyDown(e, index)}
            onChange={onChange}
          />
        ))}
      </Box>

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
  boxRef,
  color,
  checked,
  tabIndex,
  onKeyDown,
  onChange
}: {
  boxRef: React.Ref<HTMLDivElement>
  color: Record<string, string>
  checked: boolean
  tabIndex: number
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void
  onChange: (color: Record<string, string>) => void
}): JSX.Element {
  const { t } = useI18n()
  return (
    <Box
      ref={boxRef}
      role="radio"
      aria-checked={checked}
      aria-label={t('colorPicker.selectPreset', { color: color.light })}
      tabIndex={tabIndex}
      onClick={() => onChange(color)}
      onKeyDown={onKeyDown}
      sx={swatchFocusSx}
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
          visibility: checked ? 'visible' : 'hidden',
          color: color.dark
        }}
      />
    </Box>
  )
}

const HEX_COLOR = /^#([0-9A-F]{3}|[0-9A-F]{6})$/

function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value.trim().toUpperCase())
}

function ColorPickerHeader(): JSX.Element {
  const { t } = useI18n()
  return (
    <>
      <Typography variant="subtitle2">{t('colorPicker.title')}</Typography>
      <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
        {t('colorPicker.subtitle')}
      </Typography>
    </>
  )
}

function ColorPickerFields({
  color,
  onColorChange,
  onValidityChange,
  fullWidth = false
}: {
  color: Record<string, string>
  onColorChange: (c: string) => void
  onValidityChange: (valid: boolean) => void
  fullWidth?: boolean
}): JSX.Element {
  const { t } = useI18n()
  const [draftLight, setDraftLight] = useState(color.light)
  const invalid = !isHexColor(draftLight ?? '')

  useEffect(() => {
    onValidityChange(!invalid)
  }, [invalid, onValidityChange])

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
          error={invalid}
          helperText={invalid ? t('colorPicker.invalidHex') : undefined}
          autoFocus
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { 'aria-label': t('colorPicker.hex') }
          }}
        />
      </Box>
    </>
  )
}

function ColorPickerActions({
  onCancel,
  onSave,
  saveDisabled
}: {
  onCancel: () => void
  onSave: () => void
  saveDisabled: boolean
}): JSX.Element {
  const { t } = useI18n()
  return (
    <>
      <Button variant="text" onClick={onCancel}>
        {t('common.cancel')}
      </Button>
      <Button
        variant="contained"
        onClick={onSave}
        disabled={saveDisabled}
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
  const currentColor = selectedColor ?? { light: '#ffffff', dark: '#808080' }
  const [oldColor, setOldColor] = useState(currentColor)
  const [color, setColor] = useState(currentColor)
  const [hexValid, setHexValid] = useState(true)
  // Remounts the fields on each opening, so that a value typed and left
  // invalid last time does not come back
  const [openings, setOpenings] = useState(0)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)
  const theme = useTheme()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  const openPicker = (anchor: HTMLElement): void => {
    // The selected colour may have changed since mount (e.g. loaded
    // asynchronously): start from the current one when opening the picker
    setOldColor(currentColor)
    setColor(currentColor)
    setOpenings(n => n + 1)
    setAnchorEl(anchor)
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
    if (!isHexColor(c)) return
    const newLight = expandHexColor(c.trim().toUpperCase())

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
        tabIndex={0}
        aria-label={t('colorPicker.selectCustom')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={e => openPicker(e.currentTarget)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openPicker(e.currentTarget)
          }
        }}
        sx={{
          border: '1px solid',
          borderColor: 'text.disabled',
          bgcolor: 'background.paper',
          ...swatchFocusSx
        }}
        style={{
          width: '46px',
          height: '32px',
          padding: 0,
          borderRadius: '4px',
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
            backgroundColor: theme.vars.palette.text.disabled
          }}
        ></Box>
        <AddIcon sx={{ color: 'text.disabled' }} />
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
              key={openings}
              color={color}
              onColorChange={handleColorChange}
              onValidityChange={setHexValid}
              fullWidth
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <ColorPickerActions
              onCancel={handleClose}
              onSave={handleSave}
              saveDisabled={!hexValid}
            />
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
          <ColorPickerFields
            key={openings}
            color={color}
            onColorChange={handleColorChange}
            onValidityChange={setHexValid}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <ColorPickerActions
              onCancel={handleClose}
              onSave={handleSave}
              saveDisabled={!hexValid}
            />
          </Box>
        </Popover>
      )}
    </>
  )
}
