import {
  Checkbox,
  FormControl,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  SelectChangeEvent
} from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { FieldWithLabel } from '@common/components/Event/components/FieldWithLabel'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { translateDuration } from '@common/components/EventPreview/utils/parseDuration'
import { VAlarm } from '@common/types/VAlarm'
import { Valarms } from '@common/types/Valarms'

const PREDEFINED_VALUES = [
  '-PT1M',
  '-PT5M',
  '-PT10M',
  '-PT15M',
  '-PT30M',
  '-PT1H',
  '-PT2H',
  '-PT5H',
  '-PT12H',
  '-PT1D',
  '-PT2D',
  '-PT1W'
]

export interface NotificationFieldProps {
  alarms: Valarms
  setAlarms: (value: Valarms) => void
  showMore: boolean
}

export const NotificationField: React.FC<NotificationFieldProps> = ({
  alarms,
  setAlarms,
  showMore
}) => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()
  const selectedTriggers = alarms?.getAlarms()?.map(a => a?.trigger) ?? []

  const customTriggers = selectedTriggers.filter(
    trigger => trigger && !PREDEFINED_VALUES.includes(trigger)
  )

  const allValues = [...customTriggers, ...PREDEFINED_VALUES]

  const addAlarmIfNotExists = (
    currentAlarms: Valarms,
    trigger: string
  ): Valarms => {
    const exists = currentAlarms.getAlarms().some(a => a.trigger === trigger)
    if (exists) return currentAlarms
    return currentAlarms.addAlarm(new VAlarm({ trigger, action: 'EMAIL' }))
  }

  const removeAlarmByTrigger = (
    currentAlarms: Valarms,
    trigger: string
  ): Valarms => {
    const idx = currentAlarms.getAlarms().findIndex(a => a.trigger === trigger)
    if (idx === -1) return currentAlarms
    return currentAlarms.removeAlarm(idx) ?? currentAlarms
  }

  const handleChange = (e: SelectChangeEvent<string[]>) => {
    const next = e.target.value as string[]

    // If empty string is selected, clear all alarms
    if (next.includes('')) {
      setAlarms(new Valarms())
      return
    }

    const current = selectedTriggers
    const added = next.filter(v => !current.includes(v))
    const removed = current.filter(v => !next.includes(v))

    const withAdded = added.reduce(addAlarmIfNotExists, alarms)
    const withRemoved = removed.reduce(removeAlarmByTrigger, withAdded)

    setAlarms(withRemoved)
  }

  const renderValue = (selected: string[]) => {
    if (!selected.length) return t('event.form.notifications.')
    return selected.map(v => translateDuration(v, t)).join(', ')
  }

  return (
    <FieldWithLabel
      label={t('event.form.notification')}
      isExpanded={showMore && !isMobile}
    >
      <FormControl fullWidth margin="dense" size="small">
        <Select
          labelId="notification"
          multiple
          displayEmpty
          value={selectedTriggers}
          onChange={handleChange}
          input={<OutlinedInput />}
          renderValue={renderValue}
        >
          <MenuItem value="" onClick={() => setAlarms(new Valarms())}>
            {t('event.form.notifications.')}
          </MenuItem>
          {allValues.map(value => (
            <MenuItem key={value} value={value}>
              <ListItemText primary={translateDuration(value, t)} />
              <Checkbox checked={selectedTriggers.includes(value)} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </FieldWithLabel>
  )
}
