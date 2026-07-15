import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { BookingLinkSelectorMenu } from '@common/components/Calendar/BookingLinkSelectorMenu'
import CalendarPopover from '@common/components/Calendar/CalendarModal'
import { CalendarSelectorMenu } from '@common/components/Calendar/CalendarSelectorMenu'
import { DeleteCalendarDialog } from '@common/components/Calendar/DeleteCalendarDialog'
import { OwnerCaption } from '@common/components/Calendar/OwnerCaption'
import RegisterCalendars from '@common/components/Calendar/RegisterCalendars'
import type { ResourceCal } from '@common/components/Calendar/RegisterCalendars/index.types'
import { SnackbarAlert } from '@common/components/Loading/SnackBarAlert'
import {
  deleteBookingLink,
  listBookingLinks
} from '@common/features/booking/BookingLinksSlice'
import { BookingLink } from '@common/features/booking/types/BookingTypes'
import { calendarIdFromEventHref } from '@common/features/Calendars/CalendarDAO'
import {
  addCalendarResource,
  addSharedCalendar,
  removeCalendar
} from '@common/features/Calendars/CalendarSlice'
import { CalendarInput } from '@common/features/Calendars/types/CalendarData'
import { Calendar } from '@common/types/CalendarTypes'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { defaultColors } from '@common/utils/defaultColors'
import { extractEventBaseUuid } from '@common/utils/extractEventBaseUuid'
import { makeDisplayName } from '@common/utils/makeDisplayName'
import { renameDefault } from '@common/utils/renameDefault'
import { setVisibleBookingLinks } from '@common/utils/storage/setVisibleBookingLinks'
import { trimLongTextWithoutSpace } from '@common/utils/textUtils'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  alpha,
  Checkbox,
  IconButton,
  ListItem,
  Tooltip,
  Typography,
  useTheme
} from '@linagora/twake-mui'
import AddIcon from '@mui/icons-material/Add'
import EventIcon from '@mui/icons-material/Event'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import LinkIcon from '@mui/icons-material/Link'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { useI18n } from 'twake-i18n'
import { CreateAppointmentModal } from '../../features/booking/CreateAppointmentModal'
import { EditAppointmentModal } from '../../features/booking/EditAppointmentModal'
import { handleCopyLink } from '@calendar/common/src/utils/handleCopyLink'
import { useVisibleBookingLinks } from './hooks/useVisibleBookingLinks'

/**
 * Keeps a section's expanded state in sync whenever the caller's
 * `defaultExpanded` prop changes (e.g. switching views resets sections).
 */
const useSyncedExpanded = (
  defaultExpanded: boolean
): [boolean, Dispatch<SetStateAction<boolean>>] => {
  const [expanded, setExpanded] = useState(defaultExpanded)

  useEffect(() => {
    setExpanded(defaultExpanded)
  }, [defaultExpanded])

  return [expanded, setExpanded]
}

/**
 * Shared collapsible shell used by both the calendar list accordions and
 * the booking links accordion. Handles the expand/collapse chrome, the
 * optional add button, and the empty-state hiding rule; callers only
 * supply their own list content as children.
 */
const CollapsibleSection: React.FC<{
  title: string
  itemCount: number
  defaultExpanded?: boolean
  onAddClick?: () => void
  addBtnTooltip?: string
  children: ReactNode
}> = ({
  title,
  itemCount,
  defaultExpanded = false,
  onAddClick,
  addBtnTooltip,
  children
}) => {
  const { t } = useI18n()
  const [expanded, setExpanded] = useSyncedExpanded(defaultExpanded)

  if (itemCount === 0 && !onAddClick) return null

  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      expanded={expanded}
      sx={{
        width: '100%',
        padding: 0,
        margin: 0,
        marginBottom: '12px',
        boxShadow: 'none',
        '&::before': {
          display: 'none'
        }
      }}
    >
      <AccordionSummary
        expandIcon={
          itemCount > 0 ? (
            <Tooltip
              title={expanded ? t('tooltip.collapse') : t('tooltip.expand')}
            >
              <ExpandMoreIcon />
            </Tooltip>
          ) : null
        }
        aria-controls={`${title}-content`}
        id={`${title}-header`}
        className="calendarListHeader"
        onClick={() => {
          if (itemCount > 0) {
            setExpanded(!expanded)
          }
        }}
        sx={{
          '& .MuiAccordionSummary-content': {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }
        }}
      >
        <Typography variant="body2">{title}</Typography>
        {onAddClick && (
          <Tooltip title={addBtnTooltip}>
            <IconButton
              component="span"
              onClick={e => {
                if (expanded) {
                  e.stopPropagation()
                }
                onAddClick()
              }}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        )}
      </AccordionSummary>
      <AccordionDetails style={{ textAlign: 'left', padding: 0 }}>
        {children}
      </AccordionDetails>
    </Accordion>
  )
}

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

  return (
    <CollapsibleSection
      title={title}
      itemCount={calendars.length}
      defaultExpanded={defaultExpanded}
      onAddClick={showAddButton ? onAddClick : undefined}
      addBtnTooltip={addBtnTooltip}
    >
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
    </CollapsibleSection>
  )
}

const getBookingLinkUrl = (publicId: string): URL => {
  if (!window.PUBLIC_PAGE_BASE) {
    throw new Error('No public base page setup')
  }
  const prefix = `${window.PUBLIC_PAGE_BASE}/booking`
  return new URL(`${prefix}/${publicId}`)
}

const BookingLinkChip: React.FC<{
  link: BookingLink
  onDelete: (publicId: string) => void
  onEdit: (link: BookingLink) => void
  isVisible: boolean
  onToggleVisibility: () => void
}> = ({ link, onDelete, onEdit, isVisible, onToggleVisibility }) => {
  const theme = useTheme()
  const { t } = useI18n()
  const [copySnackbarOpen, setCopySnackbarOpen] = useState(false)
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null)
  const menuOpen = Boolean(menuAnchorEl)
  const calendars = useAppSelector(state => state.calendars.list)
  const calendarId = calendarIdFromEventHref(link.calendarUrl)
  const calendarColor = calendars?.[calendarId]?.color?.light
  const iconColor = isVisible
    ? (calendarColor ?? defaultColors[4].dark)
    : theme.palette.grey[400]

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>): void => {
    setMenuAnchorEl(event.currentTarget)
  }

  const handleMenuClose = (): void => setMenuAnchorEl(null)

  const handleDelete = (): void => {
    onDelete(link.publicId)
    handleMenuClose()
  }

  const handleEdit = (): void => {
    onEdit(link)
    handleMenuClose()
  }

  return (
    <>
      <ListItem
        key={link.publicId}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          '& .MoreBtn': { opacity: 0 },
          '&:hover': {
            backgroundColor: '#F3F3F6',
            '& .MoreBtn': { opacity: 1 }
          }
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            maxWidth: 'calc(100% - 40px)',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', padding: '9px', marginRight: '4px' }}>
            <EventIcon sx={{ color: iconColor }} fontSize="small" />
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                overflowWrap: 'break-word',
                fontSize: '0.875rem',
                color: alpha(theme.palette.grey[900], 0.9)
              }}
            >
              {link.name || `${link.durationMinutes}min`}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title={t('tooltip.copyBookingLink')}>
            <IconButton
              onClick={() =>
                handleCopyLink(
                  getBookingLinkUrl(link.publicId),
                  setCopySnackbarOpen
                )
              }
              size="small"
            >
              <LinkIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton className="MoreBtn" size="small" onClick={handleMenuOpen}>
            <MoreHorizIcon fontSize="small" />
          </IconButton>
        </div>
      </ListItem>
      <BookingLinkSelectorMenu
        anchorEl={menuAnchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onToggleVisibility={onToggleVisibility}
        isVisible={isVisible}
      />
      <SnackbarAlert
        open={copySnackbarOpen}
        setOpen={setCopySnackbarOpen}
        message={t('booking.linkCopied')}
      />
    </>
  )
}

const BookingLinksAccordion: React.FC<{
  title: string
  bookingLinks: BookingLink[]
  defaultExpanded?: boolean
  onDelete: (publicId: string) => void
  onEdit: (link: BookingLink) => void
  onAddClick?: () => void
  addBtnTooltip?: string
  visibleBookingLinks: string[]
  onToggleVisibility: (publicId: string) => void
}> = ({
  title,
  bookingLinks,
  defaultExpanded = false,
  onDelete,
  onEdit,
  onAddClick,
  addBtnTooltip,
  visibleBookingLinks,
  onToggleVisibility
}) => {
  return (
    <CollapsibleSection
      title={title}
      itemCount={bookingLinks.length}
      defaultExpanded={defaultExpanded}
      onAddClick={onAddClick}
      addBtnTooltip={addBtnTooltip}
    >
      {bookingLinks.map(link => (
        <BookingLinkChip
          key={link.publicId}
          link={link}
          onDelete={onDelete}
          onEdit={onEdit}
          isVisible={visibleBookingLinks.includes(link.publicId)}
          onToggleVisibility={() => onToggleVisibility(link.publicId)}
        />
      ))}
    </CollapsibleSection>
  )
}

type CalendarBuckets = {
  personal: string[]
  delegated: string[]
  shared: string[]
  resources: string[]
}

/**
 * Splits calendar ids into mutually exclusive buckets in a single pass,
 * replacing four separate `.filter()` calls that each re-derived the
 * same ownership checks.
 */
const categorizeCalendars = (
  calendars: Record<string, Calendar>,
  userId: string
): CalendarBuckets => {
  const buckets: CalendarBuckets = {
    personal: [],
    delegated: [],
    shared: [],
    resources: []
  }

  Object.keys(calendars || {}).forEach(id => {
    if (extractEventBaseUuid(id) === userId) {
      buckets.personal.push(id)
    } else if (calendars[id]?.owner?.resource) {
      buckets.resources.push(id)
    } else if (calendars[id]?.delegated) {
      buckets.delegated.push(id)
    } else {
      buckets.shared.push(id)
    }
  })

  return buckets
}

const CalendarSelection: React.FC<{
  selectedCalendars: string[]
  setSelectedCalendars: (value: SetStateAction<string[]>) => void
}> = ({ selectedCalendars, setSelectedCalendars }) => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const userId = useAppSelector(state => state.user.userData?.openpaasId) ?? ''
  const calendars = useAppSelector(state => state.calendars.list)

  const {
    personal: personalCalendars,
    delegated: delegatedCalendars,
    shared: sharedCalendars,
    resources: resourceCalendars
  } = useMemo(() => categorizeCalendars(calendars, userId), [calendars, userId])

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

  // Booking links from Redux
  const bookingLinks = useAppSelector(state => state.bookingLinks.list)
  const bookingLinkEnabled = window.BOOKING_LINK_ENABLED === true

  const [isCreateAppointmentModalOpen, setIsCreateAppointmentModalOpen] =
    useState(false)
  const [isEditAppointmentModalOpen, setIsEditAppointmentModalOpen] =
    useState(false)
  const [editingBookingLink, setEditingBookingLink] =
    useState<BookingLink | null>(null)

  // Fetch booking links on mount
  useEffect(() => {
    if (bookingLinkEnabled) {
      dispatch(listBookingLinks())
    }
  }, [dispatch, bookingLinkEnabled])

  const handleDeleteBookingLink = (publicId: string): void => {
    dispatch(deleteBookingLink(publicId))
  }

  const handleEditBookingLink = (link: BookingLink): void => {
    setEditingBookingLink(link)
    setIsEditAppointmentModalOpen(true)
  }
  const handleCloseEditModal = (): void => {
    setIsEditAppointmentModalOpen(false)
    setEditingBookingLink(null)
  }

  const visibleBookingLinks = useVisibleBookingLinks()
  const handleToggleBookingLinkVisibility = (publicId: string): void => {
    setVisibleBookingLinks(
      visibleBookingLinks.includes(publicId)
        ? visibleBookingLinks.filter(id => id !== publicId)
        : [...visibleBookingLinks, publicId]
    )
  }

  return (
    <>
      <div>
        {bookingLinkEnabled && (
          <BookingLinksAccordion
            title={t('calendar.bookingLinks')}
            bookingLinks={bookingLinks}
            defaultExpanded
            onDelete={handleDeleteBookingLink}
            onEdit={handleEditBookingLink}
            onAddClick={() => setIsCreateAppointmentModalOpen(true)}
            addBtnTooltip={t('tooltip.createAppointment')}
            visibleBookingLinks={visibleBookingLinks}
            onToggleVisibility={handleToggleBookingLinkVisibility}
          />
        )}

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
      <CreateAppointmentModal
        open={isCreateAppointmentModalOpen}
        onClose={() => setIsCreateAppointmentModalOpen(false)}
      />
      {editingBookingLink && (
        <EditAppointmentModal
          open={isEditAppointmentModalOpen}
          onClose={handleCloseEditModal}
          bookingLink={editingBookingLink}
        />
      )}
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
        onToggleVisibility={() => handleCalendarToggle(id)}
        isDefault={isDefault}
        isPersonal={isPersonal}
        isVisible={selectedCalendars.includes(id)}
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
