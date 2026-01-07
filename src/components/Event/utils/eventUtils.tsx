import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { ThunkDispatch } from "@reduxjs/toolkit";
import { emptyEventsCal } from "../../../features/Calendars/CalendarSlice";
import { getCalendarsListAsync } from "../../../features/Calendars/services/getCalendarsListAsync";
import { getCalendarDetailAsync } from "../../../features/Calendars/services/getCalendarDetailAsync";
import { Calendar } from "../../../features/Calendars/CalendarTypes";
import { userAttendee } from "../../../features/User/models/attendee";
import { refreshCalendarWithSyncToken } from "../../../features/Calendars/services/refreshCalendar";
import { formatDateToYYYYMMDDTHHMMSS } from "../../../utils/dateUtils";
import { AppDispatch } from "../../../app/store";

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
          <Typography
            noWrap
            style={{
              maxWidth: "180px",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {a.cn || a.cal_address}
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
    style: { backgroundColor: stringToColor(name) },
    children: name[0],
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

  await Promise.all(
    calendars.map((calendar) =>
      dispatch(
        refreshCalendarWithSyncToken({ calendar, calType, calendarRange })
      ).unwrap()
    )
  );
}

export async function refreshSingularCalendar(
  dispatch: ThunkDispatch<any, any, any>,
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
