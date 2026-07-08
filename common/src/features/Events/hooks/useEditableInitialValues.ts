import { useMemo } from 'react'
import { useAppSelector } from '@common/app/hooks'
import { userAttendee } from '@common/features/User/models/attendee'
import { Valarms } from '@common/types/Valarms'
import { EventFormValues } from '@common/components/Event/EventFormFields.types'
import { userData } from '@common/features/User/userDataTypes'

function getSingleAttendeeEmail(
  attendees: EventFormValues['attendees']
): string | undefined {
  if (attendees.length !== 1) return undefined
  return attendees[0]?.cal_address?.toLowerCase().replace('mailto:', '')
}

function isSingleUserEvent(
  attendees: EventFormValues['attendees'],
  currentUserEmail: string | undefined
): boolean {
  if (!currentUserEmail) return false
  if (attendees.length === 0) return true
  if (attendees.length > 1) return false
  return getSingleAttendeeEmail(attendees) === currentUserEmail
}

function createCurrentUserAttendee(
  userData: userData | undefined
): userAttendee | undefined {
  if (!userData?.email) return undefined
  return new userAttendee({
    cal_address: `mailto:${userData.email}`,
    cn: userData.name || userData.email
  })
}

function filterAlarmsForEdit(
  alarms: Valarms,
  isSingleUser: boolean,
  currentUserAttendee: userAttendee | undefined
): Valarms {
  if (isSingleUser) {
    return Valarms.fromList(alarms.getEditableAlarms(currentUserAttendee))
  }
  return Valarms.fromList(alarms.getGlobalAlarms())
}

interface UseEditableInitialValuesParams {
  initialValues: Partial<EventFormValues>
  userData: userData | undefined
}

function useEditableAlarms({
  initialValues,
  userData
}: UseEditableInitialValuesParams) {
  return useMemo(() => {
    if (!initialValues.alarms) return initialValues

    const currentUserEmail = userData?.email?.toLowerCase()
    const singleUser = isSingleUserEvent(
      initialValues.attendees || [],
      currentUserEmail
    )
    const currentUserAttendee = createCurrentUserAttendee(userData)

    return {
      ...initialValues,
      alarms: filterAlarmsForEdit(
        initialValues.alarms,
        singleUser,
        currentUserAttendee
      )
    }
  }, [initialValues, userData])
}

export function useEditableInitialValues(
  initialValues: Partial<EventFormValues>
) {
  const userData = useAppSelector(state => state.user.userData)
  return useEditableAlarms({ initialValues, userData })
}
