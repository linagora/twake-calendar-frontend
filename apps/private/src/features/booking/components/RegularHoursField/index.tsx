import React from 'react'
import { Stack } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { DayAvailability, DAYS, DAY_TO_FC } from './RegularHoursTypes'
import { DEFAULT_SLOT, useRegularHours } from '../../hooks/useRegularHours'
import { RegularHoursRow } from './RegularHoursRow'
import { FieldWithLabel } from '@common/components/Event/components/FieldWithLabel'
import { TwakeLocalizationProvider } from '@common/components/DateTimePicker'

interface RegularHoursFieldProps {
  availabilityRules?: DayAvailability[]
  setAvailabilityRules?: React.Dispatch<React.SetStateAction<DayAvailability[]>>
  workingDays?: number[]
}

export const RegularHoursField: React.FC<RegularHoursFieldProps> = ({
  availabilityRules,
  setAvailabilityRules,
  workingDays
}) => {
  const { t, lang } = useI18n()
  const {
    handleToggleDay,
    handleAddSlot,
    handleRemoveSlot,
    handleTimeChange,
    handleCopySlot,
    getDayLabel
  } = useRegularHours({
    availabilityRules: availabilityRules as DayAvailability[],
    setAvailabilityRules: setAvailabilityRules as React.Dispatch<
      React.SetStateAction<DayAvailability[]>
    >,
    workingDays
  })

  return (
    <FieldWithLabel
      sx={{ mt: 2 }}
      label={t('booking.setRegularHours')}
      isExpanded={false}
    >
      <TwakeLocalizationProvider key={lang}>
        <Stack spacing={2}>
          {DAYS.map(day => {
            const rule = availabilityRules?.find(r => r.dayOfWeek === day)
            const isWorkingDay = workingDays
              ? workingDays.includes(DAY_TO_FC[day])
              : true
            const isEnabled = rule ? rule.enabled : isWorkingDay
            const slots = rule?.slots?.length ? rule.slots : [DEFAULT_SLOT]

            return (
              <RegularHoursRow
                key={day}
                day={day}
                isWorkingDay={isWorkingDay}
                isEnabled={isEnabled}
                slots={slots}
                dayLabel={getDayLabel(day)}
                handleToggleDay={handleToggleDay}
                handleTimeChange={handleTimeChange}
                handleAddSlot={handleAddSlot}
                handleRemoveSlot={handleRemoveSlot}
                handleCopySlot={handleCopySlot}
              />
            )
          })}
        </Stack>
      </TwakeLocalizationProvider>
    </FieldWithLabel>
  )
}
