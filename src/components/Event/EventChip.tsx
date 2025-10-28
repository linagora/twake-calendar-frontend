import React, { useRef, useEffect, useState } from "react";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CircleIcon from "@mui/icons-material/Circle";
import CancelIcon from "@mui/icons-material/Cancel";
import EditIcon from "@mui/icons-material/Edit";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import SubjectIcon from "@mui/icons-material/Subject";
import VideocamIcon from "@mui/icons-material/Videocam";
import RepeatIcon from "@mui/icons-material/Repeat";
import LockOutlineIcon from "@mui/icons-material/LockOutline";
import {
  Card,
  CardHeader,
  Avatar,
  Typography,
  getContrastRatio,
  Box,
  CardContent,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { Calendars } from "../../features/Calendars/CalendarTypes";
import { userAttendee } from "../../features/User/userDataTypes";
import { EventErrorHandler } from "../Error/EventErrorHandler";
import moment from "moment";
import { InfoRow } from "./InfoRow";
import { stringAvatar } from "./utils/eventUtils";

interface EventChipProps {
  arg: any;
  calendars: Record<string, Calendars>;
  tempcalendars: Record<string, Calendars>;
  errorHandler: EventErrorHandler;
}

export function EventChip({
  arg,
  calendars,
  tempcalendars,
  errorHandler,
}: EventChipProps) {
  const event = arg.event;
  const props = event._def.extendedProps;
  const {
    calId,
    temp,
    attendee: attendees = [],
    class: classification,
  } = props;

  const cardRef = useRef<HTMLDivElement>(null);
  const [showCompact, setShowCompact] = useState(false);

  useEffect(() => {
    const checkWidth = () => {
      if (cardRef.current) {
        const width = cardRef.current.offsetWidth;
        // If width is less than 100px, show compact version (title only)
        setShowCompact(width < 100);
      }
    };

    checkWidth();

    // Optional: Add resize observer to handle dynamic resizing
    const resizeObserver = new ResizeObserver(checkWidth);
    if (cardRef.current) {
      resizeObserver.observe(cardRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  try {
    const calendarsSource = temp ? tempcalendars : calendars;
    const calendar = calendarsSource[calId];
    if (!calendar) return null;

    const isPrivate = ["PRIVATE", "CONFIDENTIAL"].includes(classification);
    const isRecurrent = event._def.extendedProps.recurrenceId;
    const ownerEmails = new Set(
      calendar.ownerEmails?.map((e) => e.toLowerCase())
    );
    const delegated = calendar.delegated;

    // determine special display logic
    const showSpecialDisplay = attendees.filter((att: userAttendee) =>
      ownerEmails.has(att.cal_address.toLowerCase())
    );

    // fallback: non-owner attendee
    if (attendees.length && !delegated && !showSpecialDisplay.length) {
      return (
        <Card
          variant="outlined"
          sx={{
            borderRadius: "4px",
            px: 0.5,
            py: 0.2,
            boxShadow: "none",
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontSize: "0.75rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {event.title}
          </Typography>
        </Card>
      );
    }

    // Color / contrast logic
    const contrastToDark = getContrastRatio(
      event._def.extendedProps.colors?.dark,
      "#fff"
    );
    const contrastToLight = getContrastRatio(
      event._def.extendedProps.colors?.light,
      "#fff"
    );
    const bestColor =
      contrastToDark > contrastToLight
        ? event._def.extendedProps.colors?.dark
        : event._def.extendedProps.colors?.light;

    let Icon: React.ElementType | null = null;
    let titleStyle: React.CSSProperties = {
      fontFamily: "Roboto",
      fontWeight: "500",
      fontStyle: "Medium",
      fontSize: "12px",
      lineHeight: "16px",
      letterSpacing: "0.5px",
      verticalAlign: "middle",
      overflow: "hidden",
      textOverflow: "ellipsis",
      font: "Roboto",
      whiteSpace: "nowrap",
      color: bestColor,
    };

    let cardStyle: React.CSSProperties = {
      width: "100%",
      height: "100%",
      borderRadius: "6px",
      boxShadow: "none",
      padding: 0,
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-start",
      border: `1px solid ${bestColor}`,
      color: bestColor,
    };
    const IconDisplayed = {
      declined: false,
      tentative: false,
      needAction: false,
      recurrent: isRecurrent,
      private: isPrivate,
    };

    // Status-based display logic
    switch (showSpecialDisplay?.[0]?.partstat) {
      case "DECLINED":
        titleStyle.textDecoration = "line-through";
        cardStyle.color = bestColor;
        cardStyle.border = `1px solid ${bestColor}`;
        IconDisplayed.declined = true;
        break;
      case "TENTATIVE":
        cardStyle.backgroundColor = calendar.color?.light;
        cardStyle.color = calendar.color?.dark;
        cardStyle.border = "1px solid white";
        titleStyle.color = calendar.color?.dark;
        IconDisplayed.tentative = true;

        break;
      case "NEEDS-ACTION":
        IconDisplayed.needAction = true;
        cardStyle.backgroundColor = "#fff";
        cardStyle.color = bestColor;
        cardStyle.border = `1px solid ${bestColor}`;
        titleStyle.color = bestColor;
        break;
      case "ACCEPTED":
        cardStyle.backgroundColor = calendar.color?.light;
        cardStyle.color = calendar.color?.dark;
        cardStyle.border = "1px solid white";
        titleStyle.color = calendar.color?.dark;
        break;
      default:
        break;
    }

    const isMonthView = arg.view.type === "dayGridMonth";
    const timeZone = arg.view.calendar?.getOption("timeZone") || "local";
    const startTime = moment.tz(event.start, timeZone).format("HH:mm");
    const endTime = moment.tz(event.end, timeZone).format("HH:mm");
    const eventLength = moment(event._instance.range.end).diff(
      moment(event._instance.range.start),
      "minutes"
    );

    const isMoreThan15 = eventLength > 15;
    const isMoreThan30 = eventLength > 30;
    const isMoreThan60 = eventLength > 60;

    // Pick which icon/avatar to show
    const AvatarIcon = isPrivate ? LockIcon : Icon ? Icon : undefined;

    const OrganizerAvatar = event._def.extendedProps.organizer
      ? stringAvatar(
          event._def.extendedProps.organizer?.cn ??
            event._def.extendedProps.organizer?.cal_address
        )
      : { style: {}, children: null };

    if (!isMoreThan15 || isMonthView) {
      return (
        <Card
          variant="outlined"
          style={{ ...cardStyle, height: "auto" }}
          ref={cardRef}
        >
          <CardHeader
            title={
              showCompact ? (
                <Typography
                  variant="body2"
                  style={{ ...titleStyle, fontSize: "11px" }}
                >
                  {event.title}
                </Typography>
              ) : (
                <Box
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <Typography
                    variant="body2"
                    style={{ ...titleStyle, fontSize: "11px" }}
                  >
                    {startTime}
                  </Typography>
                  <Typography
                    variant="body2"
                    style={{ ...titleStyle, fontSize: "11px" }}
                  >
                    {event.title}
                  </Typography>
                  {DipslayedIcons(IconDisplayed, true)}
                </Box>
              )
            }
            sx={{
              py: "0px",
              px: "5px",
              "& .MuiCardHeader-content": {
                overflow: "hidden",
              },
            }}
          />
        </Card>
      );
    }
    if (!isMoreThan30) {
      return (
        <Card variant="outlined" style={cardStyle} ref={cardRef}>
          <CardHeader
            title={
              showCompact ? (
                <Typography variant="body2" style={titleStyle}>
                  {event.title}
                </Typography>
              ) : (
                <Box
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <Typography
                    variant="body2"
                    style={{
                      ...titleStyle,
                      overflow: "visible",
                    }}
                  >
                    {startTime}
                  </Typography>
                  <Typography variant="body2" style={titleStyle}>
                    {event.title}
                  </Typography>
                  {DipslayedIcons(IconDisplayed, true)}
                </Box>
              )
            }
            sx={{
              py: "2px",
              px: "5px",
              "& .MuiCardHeader-content": {
                overflow: "hidden",
              },
            }}
          />
        </Card>
      );
    }
    return (
      <Card variant="outlined" sx={cardStyle} ref={cardRef}>
        <CardHeader
          title={
            <Box
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              {!showCompact && DipslayedIcons(IconDisplayed)}
              <Typography variant="body2" sx={titleStyle}>
                {event.title}
              </Typography>
            </Box>
          }
          subheader={
            isMoreThan30 &&
            !event._def.extendedProps.allday && (
              <Typography
                style={{
                  color: titleStyle.color,
                  opacity: "70%",
                  fontFamily: " Inter",
                  fontWeight: " 500",
                  fontSize: " 12px",
                  lineHeight: " 16px",
                  letterSpacing: " 0.5px",
                  verticalAlign: " middle",
                }}
              >
                {startTime} {!showCompact && ` - ${endTime}`}
              </Typography>
            )
          }
          sx={{
            py: "4px",
            px: "8px",
            "& .MuiCardHeader-content": {
              overflow: "hidden",
            },
          }}
        />
        {isMoreThan60 && !showCompact && (
          <CardContent
            sx={{
              py: "4px",
              px: "8px",
              "& .MuiCardContent-content": {
                overflow: "hidden",
              },
              marginTop: "auto",
            }}
          >
            {event._def.extendedProps.location && (
              <InfoRow
                icon={
                  <LocationOnOutlinedIcon
                    style={{ fontSize: "12px", marginRight: "4px" }}
                  />
                }
                text={event._def.extendedProps.location}
                style={{
                  marginRight: 2,
                  fontFamily: "Roboto",
                  fontWeight: "500",
                  fontStyle: "Medium",
                  fontSize: "11px",
                  lineHeight: "16px",
                  letterSpacing: "0.5px",
                  verticalAlign: "middle",
                  color: titleStyle.color,
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                }}
              />
            )}
            <Box sx={{ display: "flex", alignItems: "flex-start", mt: 0.5 }}>
              {event._def.extendedProps.description && (
                <Typography
                  sx={{
                    fontFamily: "Roboto",
                    fontWeight: 500,
                    fontSize: "11px",
                    lineHeight: "16px",
                    letterSpacing: "0.5px",
                    opacity: 0.8,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    whiteSpace: "normal",
                    flex: 1,
                    maxWidth: "75%",
                  }}
                >
                  {event._def.extendedProps.description}
                </Typography>
              )}
            </Box>
          </CardContent>
        )}
        {(isMoreThan60 || eventLength === 60) &&
          event._def.extendedProps.organizer &&
          !showCompact && (
            <Avatar
              children={OrganizerAvatar.children}
              style={{
                ...OrganizerAvatar.style,
                width: "25px",
                height: "25px",
                bottom: "5%",
                right: "5%",
                position: "absolute",
                border: "2px solid white",
              }}
            />
          )}
      </Card>
    );
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Unknown error during rendering";
    errorHandler.reportError(event._def.extendedProps.uid || event.id, message);

    return (
      <Card
        variant="outlined"
        sx={{
          px: 0.5,
          py: 0.2,
          borderRadius: "4px",
          boxShadow: "none",
        }}
      >
        <Typography variant="body2">{event.title}</Typography>
      </Card>
    );
  }
}
function DipslayedIcons(
  IconDisplayed: {
    declined: boolean;
    tentative: boolean;
    needAction: boolean;
    recurrent: any;
    private: boolean;
  },
  isCompact?: boolean
) {
  if (isCompact) {
    return (
      <Box
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "1px",
          fontSize: "1%",
        }}
      >
        {IconDisplayed.recurrent && <RepeatIcon fontSize="small" />}
        {IconDisplayed.private && <LockOutlineIcon fontSize="small" />}
        {IconDisplayed.tentative && <HelpOutlineIcon fontSize="small" />}
        {IconDisplayed.declined && (
          <CancelIcon color="error" fontSize="small" />
        )}
        {IconDisplayed.needAction && <HelpOutlineIcon fontSize="small" />}
      </Box>
    );
  }
  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "row",
        gap: "1px",
        fontSize: "5%",
      }}
    >
      {IconDisplayed.needAction && <HelpOutlineIcon fontSize="small" />}
      {IconDisplayed.declined && <CancelIcon color="error" fontSize="small" />}
      {IconDisplayed.tentative && <HelpOutlineIcon fontSize="small" />}
      {IconDisplayed.private && <LockOutlineIcon fontSize="small" />}
      {IconDisplayed.recurrent && <RepeatIcon fontSize="small" />}
    </Box>
  );
}
