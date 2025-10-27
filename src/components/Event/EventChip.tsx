import React from "react";
import {
  Card,
  CardHeader,
  Avatar,
  Typography,
  getContrastRatio,
  Box,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { Calendars } from "../../features/Calendars/CalendarTypes";
import { userAttendee } from "../../features/User/userDataTypes";
import { EventErrorHandler } from "../Error/EventErrorHandler";
import moment from "moment";

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

  try {
    const calendarsSource = temp ? tempcalendars : calendars;
    const calendar = calendarsSource[calId];
    if (!calendar) return null;

    const isPrivate = ["PRIVATE", "CONFIDENTIAL"].includes(classification);
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
      color: event._def.extendedProps.colors?.dark,
    };
    let cardStyle: React.CSSProperties = {
      width: "100%",
      height: "100%",
      borderRadius: "6px",
      boxShadow: "none",
      padding: 0,
    };

    // Status-based display logic
    switch (showSpecialDisplay?.[0]?.partstat) {
      case "DECLINED":
        titleStyle.textDecoration = "line-through";
        cardStyle.color = bestColor;
        cardStyle.border = `1px solid ${bestColor}`;
        break;
      case "TENTATIVE":
        Icon = HelpOutlineIcon;
        cardStyle.backgroundColor = calendar.color?.light || "#4f46e5";
        cardStyle.color = calendar.color?.darkText || "white";
        cardStyle.border = "1px solid white";
        break;
      case "NEEDS-ACTION":
        Icon = AccessTimeIcon;
        cardStyle.backgroundColor = "#fff";
        cardStyle.color = bestColor;
        cardStyle.border = `1px solid ${bestColor}`;
        break;
      case "ACCEPTED":
        cardStyle.backgroundColor = calendar.color?.light || "#4f46e5";
        cardStyle.color = calendar.color?.darkText || "white";
        cardStyle.border = "1px solid white";
        break;
      default:
        break;
    }

    const isMonthView = arg.view.type === "dayGridMonth";
    const startTime = moment(event._instance.range.start).format("HH:mm");
    const endTime = moment(event._instance.range.end).format("HH:mm");
    const eventLength = moment(event._instance.range.end).diff(
      moment(event._instance.range.start),
      "minutes"
    );

    const showSubheader = eventLength >= 30;
    const showAvatar = isPrivate || Icon;

    // Pick which icon/avatar to show
    const AvatarIcon = isPrivate ? LockIcon : Icon ? Icon : undefined;

    return (
      <Card variant="outlined" sx={cardStyle}>
        <CardHeader
          title={
            <Box
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              {showAvatar && AvatarIcon ? (
                <Avatar
                  sx={{
                    bgcolor: "transparent",
                    color: "inherit",
                    width: 22,
                    height: 22,
                    fontSize: "0.9rem",
                  }}
                >
                  <AvatarIcon fontSize="small" />
                </Avatar>
              ) : undefined}
              <Typography variant="body2" sx={titleStyle}>
                {event.title}
              </Typography>
            </Box>
          }
          subheader={
            showSubheader && !event._def.extendedProps.allday ? (
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
                {startTime} - {endTime}
              </Typography>
            ) : undefined
          }
          sx={{
            py: "4px",
            px: "8px",
            "& .MuiCardHeader-content": {
              overflow: "hidden",
            },
          }}
        />{" "}
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
