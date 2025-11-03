import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { ThunkDispatch } from "@reduxjs/toolkit";
import {
  emptyEventsCal,
  getCalendarDetailAsync,
  getCalendarsListAsync,
} from "../../../features/Calendars/CalendarSlice";
import { Calendars } from "../../../features/Calendars/CalendarTypes";
import { userAttendee } from "../../../features/User/userDataTypes";
import { formatDateToYYYYMMDDTHHMMSS } from "../../../utils/dateUtils";

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
  dispatch: ThunkDispatch<any, any, any>,
  calendars: Calendars[],
  calendarRange: { start: Date; end: Date },
  calType?: "temp"
) {
  !calType && (await dispatch(getCalendarsListAsync()));
  calType && dispatch(emptyEventsCal({ calType }));

  calendars.map(
    async (cal) =>
      await dispatch(
        getCalendarDetailAsync({
          calId: cal.id,
          match: {
            start: formatDateToYYYYMMDDTHHMMSS(calendarRange.start),
            end: formatDateToYYYYMMDDTHHMMSS(calendarRange.end),
          },
          calType,
        })
      )
  );
}

export async function refreshSingularCalendar(
  dispatch: ThunkDispatch<any, any, any>,
  calendar: Calendars,
  calendarRange: { start: Date; end: Date },
  calType?: "temp"
) {
  dispatch(emptyEventsCal({ calId: calendar.id, calType }));

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
