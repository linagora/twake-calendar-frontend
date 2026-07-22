import React from 'react'
import {
  DayOfWeek,
  DayAvailability,
  TimeSlot,
  DAYS,
  DAY_TO_FC
} from '../components/RegularHoursField/RegularHoursTypes'
import { useI18n } from 'twake-i18n'

interface UseRegularHoursProps {
  availabilityRules: DayAvailability[]
  setAvailabilityRules: React.Dispatch<React.SetStateAction<DayAvailability[]>>
  workingDays?: number[]
}

interface UseRegularHoursReturn {
  handleToggleDay: (day: DayOfWeek) => void
  handleAddSlot: (day: DayOfWeek) => void
  handleRemoveSlot: (day: DayOfWeek, index: number) => void
  handleTimeChange: (
    day: DayOfWeek,
    index: number,
    field: keyof TimeSlot,
    value: string
  ) => void
  handleCopySlot: (day: DayOfWeek, index: number) => void
  getDayLabel: (day: DayOfWeek) => string
}

export const DEFAULT_SLOT: TimeSlot = { start: '09:00', end: '18:00' }
const DEFAULT_SLOTS: TimeSlot[] = [DEFAULT_SLOT]

const updateRule = (
  prev: DayAvailability[],
  day: DayOfWeek,
  updateFn: (rule: DayAvailability) => DayAvailability,
  createFn: () => DayAvailability
): DayAvailability[] => {
  const existing = prev.find(r => r.dayOfWeek === day)
  if (existing) {
    return prev.map(rule => (rule.dayOfWeek === day ? updateFn(rule) : rule))
  }
  return [...prev, createFn()]
}

export const useRegularHours = ({
  availabilityRules,
  setAvailabilityRules,
  workingDays
}: UseRegularHoursProps): UseRegularHoursReturn => {
  const { t } = useI18n()

  const updateAvailability = (
    day: DayOfWeek,
    updateFn: (rule: DayAvailability) => DayAvailability,
    createFn: () => DayAvailability
  ): void => {
    setAvailabilityRules(prev => updateRule(prev, day, updateFn, createFn))
  }

  const handleToggleDay = (day: DayOfWeek): void => {
    updateAvailability(
      day,
      rule => ({
        ...rule,
        enabled: !rule.enabled,
        slots: rule.slots?.length ? rule.slots : [...DEFAULT_SLOTS]
      }),
      () => {
        const isWorkingDay = workingDays
          ? workingDays.includes(DAY_TO_FC[day])
          : true
        return {
          dayOfWeek: day,
          enabled: !isWorkingDay,
          slots: [...DEFAULT_SLOTS]
        }
      }
    )
  }

  const handleAddSlot = (day: DayOfWeek): void => {
    updateAvailability(
      day,
      rule => ({
        ...rule,
        slots: [...rule.slots, { ...DEFAULT_SLOT }]
      }),
      () => ({
        dayOfWeek: day,
        enabled: true,
        slots: [...DEFAULT_SLOTS, { ...DEFAULT_SLOT }]
      })
    )
  }

  const handleRemoveSlot = (day: DayOfWeek, index: number): void => {
    setAvailabilityRules(prev =>
      prev.map(rule =>
        rule.dayOfWeek === day
          ? {
              ...rule,
              slots: rule.slots.filter((_, i) => i !== index)
            }
          : rule
      )
    )
  }

  const handleTimeChange = (
    day: DayOfWeek,
    index: number,
    field: keyof TimeSlot,
    value: string
  ): void => {
    const updateSlot = (slot: TimeSlot): TimeSlot => {
      const updatedSlot = { ...slot, [field]: value }
      const isValidTime = updatedSlot.start && updatedSlot.end
      if (isValidTime && updatedSlot.start >= updatedSlot.end) {
        return slot
      }
      return updatedSlot
    }

    updateAvailability(
      day,
      rule => ({
        ...rule,
        slots: rule.slots.map((slot, i) =>
          i === index ? updateSlot(slot) : slot
        )
      }),
      () => {
        const newSlots = Array.from(
          { length: Math.max(DEFAULT_SLOTS.length, index + 1) },
          (_, i) => {
            if (i < DEFAULT_SLOTS.length) return { ...DEFAULT_SLOTS[i] }
            return { ...DEFAULT_SLOT }
          }
        )
        newSlots[index] = updateSlot(newSlots[index])
        return { dayOfWeek: day, enabled: true, slots: newSlots }
      }
    )
  }

  const handleCopySlot = (day: DayOfWeek, index: number): void => {
    const ruleToCopy = availabilityRules.find(r => r.dayOfWeek === day)
    const slotToCopy = ruleToCopy ? ruleToCopy.slots[index] : null

    if (!slotToCopy) return

    setAvailabilityRules(prev => {
      const newRules = [...prev]
      const targetDays = DAYS.filter(d => d !== day)

      targetDays.forEach(d => {
        const existingIndex = newRules.findIndex(r => r.dayOfWeek === d)
        if (existingIndex >= 0) {
          const existingRule = newRules[existingIndex]
          const newSlots = [...existingRule.slots]
          while (newSlots.length <= index) {
            newSlots.push({ ...DEFAULT_SLOT })
          }
          newSlots[index] = { ...slotToCopy }
          newRules[existingIndex] = { ...existingRule, slots: newSlots }
        } else {
          const isWorkingDay = workingDays
            ? workingDays.includes(DAY_TO_FC[d])
            : true
          const newSlots = Array.from({ length: index + 1 }, (_, i) =>
            i === index ? { ...slotToCopy } : { ...DEFAULT_SLOT }
          )
          newRules.push({
            dayOfWeek: d,
            enabled: isWorkingDay,
            slots: newSlots
          })
        }
      })
      return newRules
    })
  }

  const getDayLabel = (day: DayOfWeek): string => {
    const map: Record<DayOfWeek, string> = {
      MON: t('booking.days.MON'),
      TUE: t('booking.days.TUE'),
      WED: t('booking.days.WED'),
      THU: t('booking.days.THU'),
      FRI: t('booking.days.FRI'),
      SAT: t('booking.days.SAT'),
      SUN: t('booking.days.SUN')
    }
    return map[day]
  }

  return {
    handleToggleDay,
    handleAddSlot,
    handleRemoveSlot,
    handleTimeChange,
    handleCopySlot,
    getDayLabel
  }
}
