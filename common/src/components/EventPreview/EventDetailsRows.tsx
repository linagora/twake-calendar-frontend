import { VideoLink } from '@common/components/Event/components/VideoLink'
import { InfoRow } from '@common/components/Event/InfoRow'
import { userAttendee } from '@common/features/User/models/attendee'
import { Attachment } from '@common/types/Attachment'
import { RepetitionObject } from '@common/types/EventsTypes'
import { VAlarm } from '@common/types/VAlarm'
import { Box, Typography, useTheme } from '@linagora/twake-mui'
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined'
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import RepeatIcon from '@mui/icons-material/Repeat'
import SubjectIcon from '@mui/icons-material/Subject'
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined'
import React from 'react'
import { useI18n } from 'twake-i18n'
import { AttachementPreview } from './AttachementPreview'
import { infoIconSx } from './EventPreviewDetails'
import { makeRecurrenceString } from './utils/makeRecurrenceString'
import { translateAlarmAction, translateDuration } from './utils/parseDuration'

interface BaseEventRowProps {
  icon: React.ReactNode
  text?: string
  content?: React.ReactNode
  alignItems?: React.CSSProperties['alignItems']
  alignSelf?: React.CSSProperties['alignSelf']
  flexWrap?: React.CSSProperties['flexWrap']
  style?: React.CSSProperties
  error?: boolean
}

const BaseEventRow: React.FC<BaseEventRowProps> = ({
  icon,
  text,
  content,
  alignItems,
  alignSelf,
  flexWrap,
  style,
  error
}) => {
  const theme = useTheme()

  return (
    <InfoRow
      alignItems={alignItems}
      flexWrap={flexWrap}
      style={style}
      error={error}
      icon={
        <Box
          sx={{
            ...infoIconSx(theme),
            ...(alignItems ? { alignItems } : {}),
            ...(alignSelf ? { alignSelf } : {})
          }}
        >
          {icon}
        </Box>
      }
      text={text}
      content={content}
    />
  )
}

export const EventVideoRow: React.FC<{
  meetingLink?: string
}> = ({ meetingLink }) => {
  if (!meetingLink) return null
  return (
    <BaseEventRow
      icon={<VideocamOutlinedIcon />}
      content={<VideoLink meetingLink={meetingLink} />}
    />
  )
}

export const EventLocationRow: React.FC<{
  location?: string
}> = ({ location }) => {
  if (!location) return null
  return <BaseEventRow icon={<LocationOnOutlinedIcon />} text={location} />
}

export const EventResourceRow: React.FC<{
  resources?: userAttendee[]
}> = ({ resources }) => {
  const { t } = useI18n()
  if (!resources || resources.length === 0) return null

  return (
    <BaseEventRow
      flexWrap="wrap"
      icon={<LayersOutlinedIcon />}
      content={resources.map((resource, index) => (
        <Box
          key={resource.cn}
          sx={{
            marginRight: '5px'
          }}
        >
          <Typography
            variant="body2"
            color="textPrimary"
            sx={{
              whiteSpace: 'pre-line',
              maxHeight: '33vh',
              overflowY: 'auto',
              width: '100%',
              overflowWrap: 'break-word'
            }}
          >
            {resource.cn}
            {index < resources.length - 1 ? ',' : ''}
          </Typography>
          <Typography
            sx={{
              overflowWrap: 'break-word',
              whiteSpace: 'pre-line',
              overflowY: 'auto',
              width: '100%',
              fontSize: '13px',
              color: '#717D96'
            }}
          >
            {t(`eventPreview.attendingStatus.${resource.partstat}`)}
          </Typography>
        </Box>
      ))}
      style={{
        fontSize: '16px'
      }}
    />
  )
}

export const EventDescriptionRow: React.FC<{
  description?: string
  attach?: Attachment[]
}> = ({ description, attach }) => {
  if (!(description || !!attach?.length)) return null
  return (
    <BaseEventRow
      alignItems="flex-start"
      alignSelf="flex-start"
      icon={<SubjectIcon />}
      text={description}
      content={
        attach &&
        attach.length > 0 && <AttachementPreview attachments={attach} />
      }
    />
  )
}

export const EventAlarmRow: React.FC<{
  alarms?: VAlarm[]
}> = ({ alarms }) => {
  const { t } = useI18n()
  if (!alarms?.length) return null

  return (
    <BaseEventRow
      icon={<NotificationsNoneIcon />}
      alignItems="flex-start"
      alignSelf="flex-start"
      content={
        <Box>
          {alarms.map((alarm, index) => (
            <Typography key={`${alarm.trigger}-${index}`}>
              {t('eventPreview.alarmText', {
                trigger: translateDuration(alarm.trigger, t),
                action: translateAlarmAction(alarm.action, t)
              })}
            </Typography>
          ))}
        </Box>
      }
    />
  )
}

export const EventRepetitionRow: React.FC<{
  repetition?: RepetitionObject
}> = ({ repetition }) => {
  const { t } = useI18n()
  if (!repetition) return null

  return (
    <BaseEventRow
      icon={<RepeatIcon />}
      text={makeRecurrenceString({
        repetition,
        t,
        startText: `${t('eventPreview.recurrentEvent')} · ${t(
          `eventPreview.freq.${repetition.freq}`,
          { defaultValue: repetition.freq }
        )}`
      })}
    />
  )
}

export const EventErrorRow: React.FC<{
  error?: string
}> = ({ error }) => {
  if (!error) return null
  return (
    <BaseEventRow
      alignItems="flex-start"
      icon={
        <Box sx={{ ...infoIconSx, color: 'error.main' }}>
          <ErrorOutlinedIcon fontSize="inherit" color="inherit" />
        </Box>
      }
      text={error}
      error
    />
  )
}
