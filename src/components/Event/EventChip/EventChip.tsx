import {
  Avatar,
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
} from "@linagora/twake-mui";
import React, { useEffect, useRef, useState } from "react";
import { stringAvatar } from "../utils/eventUtils";
import { ErrorEventChip } from "./ErrorEventChip";
import {
  DisplayedIcons,
  EventChipProps,
  getBestColor,
  getCardStyle,
  getEventDuration,
  getEventTimes,
  getOwnerAttendee,
  getTitleStyle,
  IconDisplayConfig,
  useCompactMode,
} from "./EventChipUtils";
import { SimpleEventChip } from "./SimpleEventChip";

const PRIVATE_CLASSIFICATIONS = ["PRIVATE", "CONFIDENTIAL"];

export const EVENT_DURATION = {
  SHORT: 15,
  MEDIUM: 30,
  LONG: 60,
} as const;

export function EventChip({
  arg,
  calendars,
  tempcalendars,
  errorHandler,
}: EventChipProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const showCompact = useCompactMode(cardRef);

  const event = arg.event;
  const props = event._def.extendedProps;
  const {
    calId,
    temp,
    attendee: attendees = [],
    class: classification,
  } = props;

  try {
    // Calendar validation
    const calendarsSource = temp ? tempcalendars : calendars;
    const calendar = calendarsSource[calId];
    if (!calendar) return null;

    // Event properties
    const isPrivate = PRIVATE_CLASSIFICATIONS.includes(classification);
    const ownerEmails = new Set(
      calendar.ownerEmails?.map((e) => e.toLowerCase())
    );
    const delegated = calendar.delegated;

    // Determine owner attendee
    const ownerAttendee = getOwnerAttendee(attendees, ownerEmails);

    // Color and contrast logic
    const bestColor = getBestColor(
      (calendar.color as { light: string; dark: string }) ?? {
        light: "#fff",
        dark: "#000",
      }
    );

    // Icon display configuration
    const IconDisplayed: IconDisplayConfig = {
      declined: ownerAttendee?.partstat === "DECLINED",
      tentative: ownerAttendee?.partstat === "TENTATIVE",
      needAction: ownerAttendee?.partstat === "NEEDS-ACTION",
      private: isPrivate,
    };

    // View and time calculations
    const isMonthView = arg.view.type === "dayGridMonth";
    const timeZone = arg.view.calendar?.getOption("timeZone") || "UTC";
    const { startTime, endTime } = getEventTimes(event, timeZone);
    const eventLength = getEventDuration(event);

    const isMoreThan15 = eventLength > EVENT_DURATION.SHORT;
    const isMoreThan30 = eventLength > EVENT_DURATION.MEDIUM;
    const isMoreThan60 = eventLength > EVENT_DURATION.LONG;

    // Style calculation
    const titleStyle = getTitleStyle(
      bestColor,
      ownerAttendee?.partstat,
      calendar
    );
    const cardStyle = getCardStyle(
      bestColor,
      eventLength,
      ownerAttendee?.partstat,
      calendar
    );

    // Organizer avatar
    const OrganizerAvatar = event._def.extendedProps.organizer
      ? stringAvatar(
          event._def.extendedProps.organizer?.cn ??
            event._def.extendedProps.organizer?.cal_address
        )
      : { color: undefined, children: null };

    return (
      <Card
        variant="outlined"
        style={
          !isMoreThan15 || isMonthView
            ? { ...cardStyle, height: "auto" }
            : { ...cardStyle }
        }
        ref={cardRef}
        data-testid={`event-card-${event._def.extendedProps.uid}`}
      >
        <CardHeader
          sx={{
            py: "0px",
            px: "0px",
            "& .MuiCardHeader-content": {
              overflow: "hidden",
            },
          }}
          title={
            showCompact ? (
              <Typography variant="body2" style={titleStyle}>
                {event.title}
              </Typography>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <Box
                  sx={{ display: "flex", alignItems: "center", minWidth: 0 }}
                >
                  {(!isMoreThan30 || isMonthView) &&
                    !event._def.extendedProps.allday && (
                      <Typography
                        variant="body2"
                        className="compactStartTime"
                        style={{
                          ...titleStyle,
                          textDecoration: "none",
                          overflow: "visible",
                          opacity: "70%",
                          letterSpacing: "0%",
                          fontSize: "10px",
                          marginRight: "4px",
                        }}
                      >
                        {startTime}
                      </Typography>
                    )}
                  {DisplayedIcons(IconDisplayed, titleStyle.color)}
                  <Typography variant="body2" noWrap style={titleStyle}>
                    {event.title}
                  </Typography>
                </Box>
              </Box>
            )
          }
          subheader={
            isMoreThan30 &&
            !isMonthView &&
            !event._def.extendedProps.allday && (
              <Typography
                style={{
                  color: titleStyle.color,
                  opacity: "70%",
                  fontFamily: "Inter",
                  fontWeight: "500",
                  fontSize: "10px",
                  lineHeight: "16px",
                  letterSpacing: "0%",
                  verticalAlign: "middle",
                }}
              >
                {startTime} {!showCompact && ` - ${endTime}`}
              </Typography>
            )
          }
        />
        {isMoreThan60 &&
          !showCompact &&
          !isMonthView &&
          !event._def.extendedProps.allday && (
            <CardContent
              sx={{
                p: 0,
                "& .MuiCardContent-content": {
                  overflow: "hidden",
                },
              }}
            >
              {event._def.extendedProps.location && (
                <Typography
                  style={{
                    marginRight: 2,
                    fontFamily: "Roboto",
                    fontWeight: "500",
                    fontStyle: "Medium",
                    fontSize: "12px",
                    lineHeight: "16px",
                    letterSpacing: "0%",
                    verticalAlign: "middle",
                    color: titleStyle.color,
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                  }}
                >
                  {event._def.extendedProps.location}
                </Typography>
              )}
              <Box sx={{ display: "flex", alignItems: "flex-start", mt: 0.5 }}>
                {event._def.extendedProps.description && (
                  <Typography
                    sx={{
                      fontFamily: "Roboto",
                      fontWeight: 500,
                      fontSize: "10px",
                      lineHeight: "16px",
                      letterSpacing: "0%",
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
          !isMonthView &&
          !event._def.extendedProps.allday &&
          event._def.extendedProps.organizer &&
          !showCompact &&
          (window as any).displayOrgAvatar && (
            <Avatar
              children={OrganizerAvatar.children}
              color={OrganizerAvatar.color}
              size="xs"
              sx={{
                bottom: 0,
                right: 0,
                margin: "8px",
                position: "absolute",
                border: "2px solid white",
              }}
            />
          )}
      </Card>
    );
  } catch (e) {
    return (
      <ErrorEventChip event={event} errorHandler={errorHandler} error={e} />
    );
  }
}
