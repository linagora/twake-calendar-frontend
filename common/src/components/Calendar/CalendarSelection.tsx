import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import {
  addCalendarResource,
  addSharedCalendar,
  removeCalendar
} from '@common/features/Calendars/CalendarSlice'
import { CalendarInput } from '@common/features/Calendars/types/CalendarData'
import { Calendar } from '@common/types/CalendarTypes'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { extractEventBaseUuid } from '@common/utils/extractEventBaseUuid'
import { makeDisplayName } from '@common/utils/makeDisplayName'
import { renameDefault } from '@common/utils/renameDefault'
import { trimLongTextWithoutSpace } from '@common/utils/textUtils'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Checkbox,
  IconButton,
  ListItem,
  Tooltip,
  Typography
} from '@linagora/twake-mui'
import AddIcon from '@mui/icons-material/Add'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import { SetStateAction, useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from 'twake-i18n'
import CalendarPopover from './CalendarModal'
import { CalendarSelectorMenu } from './CalendarSelectorMenu'
import { DeleteCalendarDialog } from './DeleteCalendarDialog'
import { OwnerCaption } from './OwnerCaption'
import RegisterCalendars from './RegisterCalendars'
import type { ResourceCal } from './RegisterCalendars/index.types'

const CalendarAccordion: React.FC<{
  title: string
  calendars: string[]
  selectedCalendars: string[]
  handleToggle: (id: string) => void
  showAddButton?: boolean
  onAddClick?: () => void
  defaultExpanded?: boolean
  setOpen: (id: string) => void
  hideOwner?: boolean
  addBtnTooltip?: string
}> = ({
  title,
  calendars,
  selectedCalendars,
  handleToggle,
  showAddButton = false,
  onAddClick,
  defaultExpanded = false,
  setOpen,
  hideOwner,
  addBtnTooltip
}) => {
  const allCalendars = useAppSelector(state => state.calendars.list)
  const { t } = useI18n()

  const [expended, setExpended] = useState(defaultExpanded)

  useEffect(() => {
    const handleExpendedChange = (): void => {
      setExpended(defaultExpanded)
    }
    handleExpendedChange()
  }, [defaultExpanded])

  if (calendars.length === 0 && !showAddButton) return null
  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      expanded={expended}
      style={{
        width: '100%',
        padding: 0,
        margin: 0,
        marginBottom: '12px',
        boxShadow: 'none'
      }}
      sx={{
        '&::before': {
          display: 'none'
        }
      }}
    >
      <AccordionSummary
        expandIcon={
          <Tooltip
            title={expended ? t('tooltip.collapse') : t('tooltip.expand')}
          >
            <ExpandMoreIcon />
          </Tooltip>
        }
        aria-controls={`${title}-content`}
        id={`${title}-header`}
        className="calendarListHeader"
        onClick={() => setExpended(!expended)}
        sx={{
          '& .MuiAccordionSummary-content': {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }
        }}
      >
        <Typography variant="body2">{title}</Typography>
        {showAddButton && (
          <Tooltip title={addBtnTooltip}>
            <IconButton
              component="span"
              onClick={e => {
                if (expended) {
                  e.stopPropagation()
                }
                if (onAddClick) {
                  onAddClick()
                }
              }}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        )}
      </AccordionSummary>
      <AccordionDetails style={{ textAlign: 'left', padding: 0 }}>
        {calendars.map(id => (
          <CalendarSelector
            key={id}
            calendars={allCalendars}
            id={id}
            isPersonal={title === t('calendar.personal')}
            selectedCalendars={selectedCalendars}
            handleCalendarToggle={handleToggle}
            setOpen={() => setOpen(id)}
            hideOwner={hideOwner}
          />
        ))}
      </AccordionDetails>
    </Accordion>
  )
}

const CalendarSelection: React.FC<{
  selectedCalendars: string[]
  setSelectedCalendars: (value: SetStateAction<string[]>) => void
}> = ({ selectedCalendars, setSelectedCalendars }) => {
  const { t } = useI18n()
  const userId = useAppSelector(state => state.user.userData?.openpaasId) ?? ''
  const calendars = useAppSelector(state => state.calendars.list)

  const personalCalendars = Object.keys(calendars || {}).filter(
    id => extractEventBaseUuid(id) === userId
  )
  const delegatedCalendars = Object.keys(calendars || {}).filter(
    id =>
      extractEventBaseUuid(id) !== userId &&
      calendars[id]?.delegated &&
      !calendars?.[id]?.owner?.resource
  )
  const sharedCalendars = Object.keys(calendars || {}).filter(
    id =>
      extractEventBaseUuid(id) !== userId &&
      !calendars?.[id]?.delegated &&
      !calendars?.[id]?.owner?.resource
  )
  const resourceCalendars = Object.keys(calendars || {}).filter(
    id =>
      extractEventBaseUuid(id) !== userId && calendars?.[id]?.owner?.resource
  )

  const handleCalendarToggle = (name: string): void => {
    setSelectedCalendars((prev: string[]) =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    )
  }
  const [selectedCalId, setSelectedCalId] = useState('')

  const [anchorElCal, setAnchorElCal] = useState<HTMLElement | null>(null)
  const [anchorElCalOthers, setAnchorElCalOthers] =
    useState<HTMLElement | null>(null)
  const [anchorElCalResources, setAnchorElCalResources] =
    useState<HTMLElement | null>(null)

  return (
    <>
      <div>
        <CalendarAccordion
          title={t('calendar.personal')}
          calendars={personalCalendars}
          selectedCalendars={selectedCalendars}
          handleToggle={handleCalendarToggle}
          showAddButton
          onAddClick={() => setAnchorElCal(document.body)}
          setOpen={(id: string) => {
            setAnchorElCal(document.body)
            setSelectedCalId(id)
          }}
          defaultExpanded
          addBtnTooltip={t('tooltip.addPersonalCalendar')}
        />

        <CalendarAccordion
          title={t('calendar.delegated')}
          calendars={delegatedCalendars}
          selectedCalendars={selectedCalendars}
          handleToggle={handleCalendarToggle}
          setOpen={(id: string) => {
            setAnchorElCal(document.body)
            setSelectedCalId(id)
          }}
          defaultExpanded
        />

        <CalendarAccordion
          title={t('calendar.other')}
          calendars={sharedCalendars}
          selectedCalendars={selectedCalendars}
          showAddButton
          onAddClick={() => {
            setAnchorElCalOthers(document.body)
          }}
          handleToggle={handleCalendarToggle}
          setOpen={(id: string) => {
            setAnchorElCal(document.body)
            setSelectedCalId(id)
          }}
          defaultExpanded
          addBtnTooltip={t('tooltip.registerOtherCalendars')}
        />

        {!window.HIDE_RESOURCES && (
          <CalendarAccordion
            title={t('calendar.resources')}
            calendars={resourceCalendars}
            selectedCalendars={selectedCalendars}
            onAddClick={() => {
              setAnchorElCalResources(document.body)
            }}
            showAddButton
            handleToggle={handleCalendarToggle}
            setOpen={(id: string) => {
              setAnchorElCal(document.body)
              setSelectedCalId(id)
            }}
            defaultExpanded
            hideOwner={true}
            addBtnTooltip={t('tooltip.registerResources')}
          />
        )}
      </div>
      <CalendarPopover
        open={Boolean(anchorElCal)}
        calendar={calendars?.[selectedCalId] ?? undefined}
        onClose={() => {
          setSelectedCalId('')
          setAnchorElCal(null)
        }}
      />
      <RegisterCalendars
        open={Boolean(anchorElCalOthers)}
        objectTypes={['user']}
        onSave={({ userId, calId, cal }) =>
          addSharedCalendar({
            userId,
            calId,
            cal: cal as CalendarInput
          })
        }
        onClose={(newCalIds?: string[] | Record<string, never>) => {
          setAnchorElCalOthers(null)
          if (newCalIds?.length) {
            newCalIds.forEach(id => handleCalendarToggle(id))
          }
        }}
      />
      <RegisterCalendars
        open={Boolean(anchorElCalResources)}
        objectTypes={['resource']}
        onSave={({ userId, calId, cal }) =>
          addCalendarResource({
            userId,
            calId,
            cal: cal as ResourceCal
          })
        }
        onClose={(newResourceIds?: string[] | Record<string, never>) => {
          setAnchorElCalResources(null)
          if (newResourceIds?.length) {
            newResourceIds.forEach(id => {
              handleCalendarToggle(id)
            })
          }
        }}
      />
    </>
  )
}

const CalendarSelector: React.FC<{
  calendars: Record<string, Calendar>
  id: string
  isPersonal: boolean
  selectedCalendars: string[]
  handleCalendarToggle: (name: string) => void
  setOpen: () => void
  hideOwner?: boolean
}> = ({
  calendars,
  id,
  isPersonal,
  selectedCalendars,
  handleCalendarToggle,
  setOpen,
  hideOwner
}) => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const calLink = useAppSelector(state => state.calendars.list[id].link) ?? ''
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    setAnchorEl(event.currentTarget)
  }
  const handleClose = (): void => {
    setAnchorEl(null)
  }

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPressedRef = useRef(false)

  const handleTouchStart = (): void => {
    if (!isMobile) return
    isLongPressedRef.current = false
    longPressTimerRef.current = setTimeout(() => {
      isLongPressedRef.current = true
      setAnchorEl(document.body)
    }, 300)
  }

  const handleTouchEnd = (): void => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleTouchMove = (): void => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const [userId, calId] = id.split('/')
  const isDefault = isPersonal && userId === calId

  const [deletePopupOpen, setDeletePopupOpen] = useState(false)
  const handleDeleteConfirm = async (): Promise<void> => {
    await dispatch(removeCalendar({ calId: id, calLink }))
    setDeletePopupOpen(false)
    handleClose()
  }

  const trimmedName = useMemo(
    () => trimLongTextWithoutSpace(calendars[id].name),
    [calendars, id]
  )

  const ownerDisplayName = useMemo(
    () => makeDisplayName(calendars[id]),
    [calendars, id]
  )

  const displayName = useMemo(
    () => renameDefault(trimmedName, ownerDisplayName ?? '', t, isPersonal),
    [trimmedName, ownerDisplayName, t, isPersonal]
  )

  const showCaption =
    !isPersonal &&
    trimmedName !== '#default' &&
    ownerDisplayName != null &&
    !hideOwner

  return (
    <>
      <ListItem
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'background-color 0.2s ease',
          '& .MoreBtn': { opacity: 0 },
          '&:hover': {
            backgroundColor: '#F3F3F6',
            '& .MoreBtn': { opacity: 1 }
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onClickCapture={e => {
          if (isLongPressedRef.current) {
            e.stopPropagation()
            e.preventDefault()
          }
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            maxWidth: 'calc(100% - 40px)',
            overflow: 'hidden'
          }}
        >
          <Checkbox
            sx={{
              color: calendars[id].color?.light,
              '&.Mui-checked': { color: calendars[id].color?.light }
            }}
            size="small"
            checked={selectedCalendars.includes(id)}
            onChange={() => handleCalendarToggle(id)}
            slotProps={{ input: { 'aria-label': displayName } }}
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              padding: showCaption ? '6px' : undefined
            }}
          >
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                overflowWrap: 'break-word'
              }}
            >
              {displayName}
            </span>
            <OwnerCaption
              showCaption={showCaption}
              ownerDisplayName={ownerDisplayName ?? ''}
            />
          </div>
        </label>
        {!isMobile && (
          <IconButton className="MoreBtn" onClick={handleClick}>
            <MoreHorizIcon />
          </IconButton>
        )}
      </ListItem>

      <CalendarSelectorMenu
        id={id}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onModify={setOpen}
        onDelete={() => setDeletePopupOpen(true)}
        isDefault={isDefault}
        isPersonal={isPersonal}
      />

      <DeleteCalendarDialog
        deletePopupOpen={deletePopupOpen}
        setDeletePopupOpen={setDeletePopupOpen}
        calendars={calendars}
        id={id}
        isPersonal={isPersonal}
        handleDeleteConfirm={() => void handleDeleteConfirm()}
      />
    </>
  )
}

export default CalendarSelection
