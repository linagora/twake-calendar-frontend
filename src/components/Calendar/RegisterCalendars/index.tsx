import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchCalendars } from '@/features/Calendars/CalendarDAO'
import { Calendar } from '@/features/Calendars/CalendarTypes'
import { Button, TextField, useTheme } from '@linagora/twake-mui'
import { useMemo, useRef, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { PeopleSearch } from '../../Attendees/PeopleSearch'
import { User } from '../../Attendees/types'
import { ResponsiveDialog } from '../../Dialog'
import { useScreenSizeDetection } from '@/useScreenSizeDetection'
import { SelectedCalendarsList } from './CalendarSearchResults'
import { SearchCalendarsDialog } from './SearchCalendarsDialog'
import { CalendarWithOwner, ResourceCal } from './index.types'
import { OpenPaasUserData } from '@/features/User/type/OpenPaasUserData'
import { AsyncThunkAction, AsyncThunkConfig } from '@reduxjs/toolkit'
import { CalendarInput } from '@/features/Calendars/types/CalendarData'
import { getAccessiblePair } from '@/utils/getAccessiblePair'
import { defaultColors } from '@/utils/defaultColors'

const RegisterCalendars: React.FC<{
  open: boolean
  objectTypes: string[]
  onSave: (params: {
    userId: string
    calId: string
    cal: CalendarInput | ResourceCal
  }) => AsyncThunkAction<
    {
      calId: string
      color: Record<string, string>
      link: string
      name: string
      desc: string
      owner: OpenPaasUserData
    },
    {
      userId: string
      calId: string
      cal: CalendarInput | ResourceCal
    },
    AsyncThunkConfig
  >
  onClose: (
    result?: string[] | Record<string, never>,
    reason?: 'backdropClick' | 'escapeKeyDown'
  ) => void
}> = ({ open, objectTypes, onSave, onClose }) => {
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  const dispatch = useAppDispatch()
  const theme = useTheme()

  const openpaasId =
    useAppSelector(state => state.user.userData?.openpaasId) ?? ''
  const calendars = useAppSelector(state => state.calendars.list)

  const [selectedCal, setSelectedCalendars] = useState<CalendarWithOwner[]>([])
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [isOpenSearchDialog, setIsOpenSearchDialog] = useState(false)

  const fetchSeqRef = useRef(0)

  const keyName = useMemo(() => {
    if (objectTypes.includes('user')) {
      return 'email'
    }
    return 'displayName'
  }, [objectTypes])

  const checkIfCalendarExisted = (
    calendars: Record<string, Calendar>,
    cal: CalendarWithOwner
  ): boolean => {
    return Object.values(calendars).some(
      (existing: Calendar) =>
        existing.id ===
        cal.cal?._links?.self?.href
          ?.replace('/calendars/', '')
          .replace('.json', '')
    )
  }

  const handleClose = (
    result?: string[] | Record<string, never>,
    reason?: 'backdropClick' | 'escapeKeyDown'
  ): void => {
    fetchSeqRef.current += 1 // invalidate in-flight fetch results
    onClose(result, reason)
    setSelectedCalendars([])
    setSelectedUsers([])
    setIsOpenSearchDialog(false)
  }

  const handleSave = async (): Promise<void> => {
    if (!selectedCal?.length) {
      handleClose()
      return
    }
    const results = await Promise.allSettled(
      selectedCal.map(async cal => {
        const calId = crypto.randomUUID()
        const exists = checkIfCalendarExisted(calendars, cal)
        if (exists || !cal.cal) return null

        await dispatch(
          onSave({
            userId: openpaasId,
            calId,
            cal: {
              ...cal,
              color: (cal.cal['apple:color']
                ? {
                    light: cal.cal['apple:color'],
                    dark: getAccessiblePair(cal.cal['apple:color'], theme)
                  }
                : defaultColors[0]) as unknown as Record<string, string>
            }
          })
        ).unwrap()
        return cal.cal._links.self?.href
          ?.replace('/calendars/', '')
          .replace('.json', '')
      })
    )

    const idList = results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<string | null>).value)
      .filter(Boolean) as string[]
    handleClose(idList)
  }
  const { t } = useI18n()

  const handleInputFocus = (
    e: React.FocusEvent<HTMLInputElement>
  ): void | undefined => {
    if (!isMobile) return
    setIsOpenSearchDialog(true)
    e.currentTarget.blur()
  }

  const handleSearchChange = async (
    _event: React.SyntheticEvent,
    value: User[]
  ): Promise<void> => {
    const requestSeq = ++fetchSeqRef.current
    setSelectedUsers(value)

    const results = await Promise.allSettled(
      value.map(async (user: User) => {
        if (!user?.openpaasId) return null
        const cals = await fetchCalendars(user.openpaasId, 'sharedPublic=true&')
        return cals._embedded?.['dav:calendar']?.length > 0
          ? cals._embedded['dav:calendar'].map(cal => ({
              cal,
              owner: user
            }))
          : [{ cal: undefined, owner: user }]
      })
    )

    const successfulCals = results
      .filter(result => result.status === 'fulfilled')
      .map(
        result => (result as PromiseFulfilledResult<CalendarWithOwner[]>).value
      )
      .flat()
      .filter(Boolean)

    if (requestSeq !== fetchSeqRef.current) return
    setSelectedCalendars(successfulCals)
  }

  return (
    <ResponsiveDialog
      open={open}
      contentSx={{ paddingTop: '8px !important' }}
      onClose={() => handleClose({}, 'backdropClick')}
      title={t('calendar.browseOtherCalendars')}
      actions={
        <>
          <Button
            variant="outlined"
            onClick={() => handleClose({}, 'backdropClick')}
          >
            {t('common.cancel')}
          </Button>
          <Button variant="contained" onClick={() => void handleSave()}>
            {t('actions.add')}
          </Button>
        </>
      }
    >
      <PeopleSearch
        objectTypes={objectTypes}
        selectedUsers={selectedUsers}
        inputSlot={params => (
          <TextField
            {...params}
            size="small"
            autoFocus
            onFocus={handleInputFocus}
          />
        )}
        onChange={(_event: React.SyntheticEvent, value: User[]) =>
          void handleSearchChange(_event, value)
        }
      />

      <SelectedCalendarsList
        keyName={keyName}
        calendars={calendars}
        selectedCal={selectedCal}
        onRemove={cal => {
          if (!cal.cal?._links?.self?.href) return
          setSelectedCalendars(prev =>
            prev.filter(
              c => c.cal?._links?.self?.href !== cal.cal._links.self?.href
            )
          )
          if (
            !selectedCal.find(
              c =>
                cal.owner[keyName] === c.owner[keyName] &&
                c.cal?._links?.self?.href !== cal.cal._links.self?.href
            )
          ) {
            setSelectedUsers(prev =>
              prev.filter(u => u[keyName] !== cal.owner[keyName])
            )
          }
        }}
        onColorChange={(cal, color) =>
          setSelectedCalendars(prev =>
            prev.map(prevcal =>
              prevcal.owner[keyName] === cal.owner[keyName] &&
              prevcal.cal?._links?.self?.href === cal.cal?._links?.self?.href
                ? {
                    ...prevcal,
                    cal: {
                      ...prevcal.cal,
                      'apple:color': color.light
                    }
                  }
                : prevcal
            )
          )
        }
      />

      {isMobile && (
        <SearchCalendarsDialog
          objectTypes={objectTypes}
          open={isOpenSearchDialog}
          selectedUsers={selectedUsers}
          onChange={handleSearchChange}
          onClose={() => setIsOpenSearchDialog(false)}
          onCloseRegister={handleClose}
        />
      )}
    </ResponsiveDialog>
  )
}

export default RegisterCalendars
