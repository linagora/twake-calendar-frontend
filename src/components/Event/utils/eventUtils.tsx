import { AppDispatch } from "@/app/store";
import { emptyEventsCal } from "@/features/Calendars/CalendarSlice";
import { Calendar } from "@/features/Calendars/CalendarTypes";
import {
  getCalendarDetailAsync,
  getCalendarsListAsync,
  refreshCalendarWithSyncToken,
} from "@/features/Calendars/services";
import { userAttendee } from "@/features/User/models/attendee";
import { getInitials, stringToGradient } from "@/utils/avatarUtils";
import { formatDateToYYYYMMDDTHHMMSS } from "@/utils/dateUtils";
import { Avatar, Badge, Box, Typography } from "@linagora/twake-mui";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const EMAIL_DISPLAY_MAX_LENGTH = 50;

function truncateDisplayText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function renderAttendeeBadge(
  a: userAttendee,
  key: string,
  t: Function,
  isFull?: boolean,
  isOrganizer?: boolean
) {
  const classIcon =
    a.partstat === "ACCEPTED" ? (
      <CheckCircleIcon fontSize="inherit" color="success" />
    ) : a.partstat === "DECLINED" ? (
      <CancelIcon fontSize="inherit" color="error" />
    ) : null;

  if (!isFull) {
    return <Avatar key={key} {...stringAvatar(a.cn || a.cal_address)} />;
  } else {
    return (
      <Box
        key={key}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          marginBottom: 0.5,
          padding: 0.5,
          borderRadius: 1,
        }}
      >
        <Badge
          overlap="circular"
          sx={{ marginRight: 2 }}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          badgeContent={
            classIcon && (
              <Box
                style={{
                  fontSize: 14,
                  lineHeight: 0,
                  backgroundColor: "white",
                  borderRadius: "50%",
                  padding: "1px",
                }}
              >
                {classIcon}
              </Box>
            )
          }
        >
          <Avatar {...stringAvatar(a.cn || a.cal_address)} />
        </Badge>
        <Box style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Typography noWrap>
            {truncateDisplayText(
              a.cn || a.cal_address,
              EMAIL_DISPLAY_MAX_LENGTH
            )}
          </Typography>
          {isOrganizer && (
            <Typography variant="caption" color="text.secondary">
              {t("event.organizer")}
            </Typography>
          )}
        </Box>
      </Box>
    );
  }
}

export function stringToColor(string: string) {
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }

  return color;
}

export function stringAvatar(name: string) {
  return {
    color: stringToGradient(name),
    children: getInitials(name),
  };
}

export async function refreshCalendars(
  dispatch: AppDispatch,
  calendars: Calendar[],
  calendarRange: {
    start: Date;
    end: Date;
  },
  calType?: "temp"
) {
  if (process.env.NODE_ENV === "test") return;

  !calType && (await dispatch(getCalendarsListAsync()));

  const results = await Promise.allSettled(
    calendars.map((calendar) =>
      dispatch(
        refreshCalendarWithSyncToken({ calendar, calType, calendarRange })
      ).unwrap()
    )
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(
        `Failed to refresh calendar ${calendars[index].id}:`,
        result.reason
      );
    }
  });
}

export async function refreshSingularCalendar(
  dispatch: AppDispatch,
  calendar: Calendar,
  calendarRange: { start: Date; end: Date },
  calType?: "temp"
) {
  const isTestEnv = process.env.NODE_ENV === "test";
  dispatch(emptyEventsCal({ calId: calendar.id, calType }));

  if (isTestEnv) {
    return;
  }

  await dispatch(
    getCalendarDetailAsync({
      calId: calendar.id,
      match: {
        start: formatDateToYYYYMMDDTHHMMSS(calendarRange.start),
        end: formatDateToYYYYMMDDTHHMMSS(calendarRange.end),
      },
      calType,
    })
  );
}
