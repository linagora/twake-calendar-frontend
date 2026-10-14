import { FieldWithLabel } from '@common/components/Event/components/FieldWithLabel'
import { SectionPreviewRow } from '@common/components/Event/components/SectionPreviewRow'
import { OwnerCaption } from '@common/components/Calendar/OwnerCaption'
import { fetchUserById } from '@common/features/User/UserDao'
import { userOrganiser } from '@common/features/User/userDataTypes'
import {
  Calendar,
  CalendarInvite,
  WRITE_ACCESS_LEVELS
} from '@common/types/CalendarTypes'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { normalizeEmail } from '@common/utils/normalizeEmail'
import {
  Box,
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography
} from '@linagora/twake-mui'
import { Avatar } from '@common/ds/Avatar/Avatar'
import PeopleOutlineOutlinedIcon from '@mui/icons-material/PeopleOutlineOutlined'
import React, { useEffect, useState } from 'react'
import { useI18n } from 'twake-i18n'

export interface OrganizerSelectFieldProps {
  calendar: Calendar
  value: userOrganiser
  onChange: (organizer: userOrganiser) => void
  userOrganizer: userOrganiser
  showMore: boolean
  disabled?: boolean
}

const getCleanEmail = (address?: string): string =>
  normalizeEmail(address?.replace(/^mailto:/i, '') ?? '')

const isWriteAccessInvite = (invite: CalendarInvite): boolean =>
  Boolean(
    invite.principal &&
    invite.access &&
    WRITE_ACCESS_LEVELS.includes(invite.access)
  )

const extractPrincipalId = (principal?: string): string | undefined =>
  principal?.split('/').pop()

const fetchOrganizerFromPrincipal = async (
  principalId: string
): Promise<userOrganiser | null> => {
  try {
    const userDetails = await fetchUserById(principalId)
    if (!userDetails) return null

    const email = userDetails.preferredEmail ?? userDetails.emails?.[0] ?? ''
    const normalized = normalizeEmail(email)
    if (!normalized) return null

    const displayName =
      [userDetails.firstname, userDetails.lastname]
        .filter(Boolean)
        .join(' ')
        .trim() || email

    return new userOrganiser({
      cn: displayName,
      cal_address: `mailto:${email}`
    })
  } catch {
    return null
  }
}

export const OrganizerSelectField: React.FC<OrganizerSelectFieldProps> = ({
  calendar,
  value,
  onChange,
  userOrganizer,
  showMore,
  disabled
}) => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()
  const [organizers, setOrganizers] = useState<userOrganiser[]>([userOrganizer])
  const [hasClickedSection, setHasClickedSection] = useState(false)

  useEffect(() => {
    let isCancelled = false

    async function loadWriteAccessUsers(): Promise<void> {
      setOrganizers([userOrganizer])
      const initialEmail = getCleanEmail(userOrganizer.cal_address)
      const knownEmails = new Set<string>([initialEmail])
      const list: userOrganiser[] = [userOrganizer]

      const writeInvites = calendar.invite?.filter(isWriteAccessInvite) ?? []

      for (const invite of writeInvites) {
        const principalId = extractPrincipalId(invite.principal)
        if (!principalId) continue

        const organizer = await fetchOrganizerFromPrincipal(principalId)
        if (!organizer) continue

        const email = getCleanEmail(organizer.cal_address)
        if (knownEmails.has(email)) continue

        knownEmails.add(email)
        list.push(organizer)
      }

      if (!isCancelled) {
        setOrganizers(list)
      }
    }

    void loadWriteAccessUsers()

    return (): void => {
      isCancelled = true
    }
  }, [calendar, userOrganizer])

  const isCollapsed = !showMore && !hasClickedSection

  const selectedEmail = getCleanEmail(value?.cal_address)
  const currentSelected =
    organizers.find(o => getCleanEmail(o.cal_address) === selectedEmail) ??
    value ??
    userOrganizer

  const handleSelectChange = (e: SelectChangeEvent): void => {
    const chosenAddress = e.target.value
    const matched = organizers.find(o => o.cal_address === chosenAddress)
    if (matched) {
      onChange(matched)
    }
  }

  return (
    <FieldWithLabel
      label={isCollapsed ? '' : t('event.organizer')}
      isExpanded={!isMobile && showMore}
    >
      {isCollapsed ? (
        <SectionPreviewRow
          icon={<PeopleOutlineOutlinedIcon sx={{ width: 24, height: 24 }} />}
          onClick={() => !disabled && setHasClickedSection(true)}
        >
          <Box style={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="body2" sx={{ overflowWrap: 'break-word' }}>
              {currentSelected.cn || getCleanEmail(currentSelected.cal_address)}
            </Typography>
          </Box>
        </SectionPreviewRow>
      ) : (
        <FormControl fullWidth margin="dense" size="small">
          <Select
            value={currentSelected.cal_address}
            disabled={disabled}
            SelectDisplayProps={{ 'aria-label': t('event.organizer') }}
            onChange={handleSelectChange}
            renderValue={selectedAddress => {
              const selectedOrg =
                organizers.find(o => o.cal_address === selectedAddress) ??
                currentSelected
              const displayEmail = getCleanEmail(selectedOrg.cal_address)
              const displayName = selectedOrg.cn || displayEmail

              return displayName
            }}
          >
            {organizers.map(org => {
              const displayEmail = getCleanEmail(org.cal_address)
              const hasName = Boolean(org.cn && org.cn !== displayEmail)

              return (
                <MenuItem key={org.cal_address} value={org.cal_address}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 24,
                        height: 24,
                        fontSize: '0.75rem'
                      }}
                    >
                      {(org.cn || displayEmail).charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography
                        variant="body2"
                        sx={{ overflowWrap: 'break-word' }}
                      >
                        {org.cn || displayEmail}
                      </Typography>
                      <OwnerCaption
                        showCaption={hasName}
                        ownerDisplayName={displayEmail}
                      />
                    </Box>
                  </Box>
                </MenuItem>
              )
            })}
          </Select>
        </FormControl>
      )}
    </FieldWithLabel>
  )
}
