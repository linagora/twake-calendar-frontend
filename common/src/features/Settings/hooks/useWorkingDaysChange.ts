import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import {
  BusinessHour,
  setBusinessHours,
  setWorkingDays
} from '../SettingsSlice'
import { useCallback, useEffect, useRef } from 'react'
import { updateUserConfigurations } from '@common/features/User/UserSlice'

interface UseWorkingDaysReturn {
  workingDays: boolean | null
  businessHours: BusinessHour | null
  handleBusinessHour: ({ days }: { days: number[] }) => void
  handleWorkingDays: (value: boolean) => void
}

const useWorkingDaysToggle = (
  onWorkingDaysError: () => void
): Pick<UseWorkingDaysReturn, 'workingDays' | 'handleWorkingDays'> => {
  const dispatch = useAppDispatch()
  const workingDays = useAppSelector(state => state.settings.workingDays)
  const latestWorkingDaysRef = useRef<boolean | undefined>(undefined)

  const handleWorkingDays = useCallback(
    (value: boolean): void => {
      latestWorkingDaysRef.current = value
      dispatch(setWorkingDays(value))
      dispatch(updateUserConfigurations({ workingDays: value }))
        .unwrap()
        .catch(() => {
          if (latestWorkingDaysRef.current === value) {
            dispatch(setWorkingDays(!value))
          }
          onWorkingDaysError()
        })
    },
    [dispatch, onWorkingDaysError]
  )

  return { workingDays, handleWorkingDays }
}

const useBusinessHoursConfig = (
  onWorkingDaysError: () => void
): Pick<UseWorkingDaysReturn, 'businessHours' | 'handleBusinessHour'> => {
  const dispatch = useAppDispatch()
  const businessHours = useAppSelector(state => state.settings.businessHours)

  const pendingBusinessHoursRef = useRef<BusinessHour | null>(null)
  const businessHoursTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const committedBusinessHoursRef = useRef<BusinessHour | null>(businessHours)

  useEffect(() => {
    if (!businessHoursTimeoutRef.current) {
      committedBusinessHoursRef.current = businessHours
    }
  }, [businessHours])

  const handleBusinessHour = useCallback(
    ({ days }: { days: number[] }) => {
      const value: BusinessHour | null = businessHours
        ? { ...businessHours, daysOfWeek: days }
        : null

      dispatch(setBusinessHours(value))
      pendingBusinessHoursRef.current = value

      if (businessHoursTimeoutRef.current) {
        clearTimeout(businessHoursTimeoutRef.current)
      }

      businessHoursTimeoutRef.current = setTimeout(() => {
        const targetValue = pendingBusinessHoursRef.current
        dispatch(
          updateUserConfigurations({
            businessHours: targetValue
          })
        )
          .unwrap()
          .then(() => {
            committedBusinessHoursRef.current = targetValue
            businessHoursTimeoutRef.current = null
            return null
          })
          .catch(() => {
            dispatch(setBusinessHours(committedBusinessHoursRef.current))
            onWorkingDaysError()
            businessHoursTimeoutRef.current = null
          })
      }, 500)
    },
    [businessHours, dispatch, onWorkingDaysError]
  )

  useEffect(() => {
    return (): void => {
      if (businessHoursTimeoutRef.current) {
        clearTimeout(businessHoursTimeoutRef.current)
      }
    }
  }, [])

  return { businessHours, handleBusinessHour }
}

export const useWorkingDaysChange = (
  onWorkingDaysError: () => void
): UseWorkingDaysReturn => {
  const { workingDays, handleWorkingDays } =
    useWorkingDaysToggle(onWorkingDaysError)
  const { businessHours, handleBusinessHour } =
    useBusinessHoursConfig(onWorkingDaysError)

  return {
    workingDays,
    businessHours,
    handleBusinessHour,
    handleWorkingDays
  }
}
