import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import {
  Avatar,
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
} from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import { InfoRow } from "../InfoRow";
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
} from "./EventChipUtils";
import { SimpleEventChip } from "./SimpleEventChip";

const COMPACT_WIDTH_THRESHOLD = 100;
const PRIVATE_CLASSIFICATIONS = ["PRIVATE", "CONFIDENTIAL"];

const EVENT_DURATION = {
  SHORT: 15,
  MEDIUM: 30,
  LONG: 60,
} as const;

function useCompactMode(
  cardRef: React.RefObject<HTMLDivElement | null>
): boolean {
  const [showCompact, setShowCompact] = useState(false);

  useEffect(() => {
    const checkWidth = () => {
      if (cardRef.current) {
        const width = cardRef.current.offsetWidth;
        setShowCompact(width < COMPACT_WIDTH_THRESHOLD);
      }
    };

    checkWidth();

    const resizeObserver = new ResizeObserver(checkWidth);
    if (cardRef.current) {
      resizeObserver.observe(cardRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return showCompact;
}

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
    const isRecurrent = !!event._def.extendedProps.recurrenceId;
    const ownerEmails = new Set(
      calendar.ownerEmails?.map((e) => e.toLowerCase())
    );
    const delegated = calendar.delegated;

    // Determine owner attendee
    const ownerAttendee = getOwnerAttendee(attendees, ownerEmails);

    // Handle non-owner attendee case
    if (attendees.length && !delegated && !ownerAttendee) {
      return <SimpleEventChip title={event.title} />;
    }

    // Color and contrast logic
    const bestColor = getBestColor(event._def.extendedProps.colors);

    // Style calculation
    const titleStyle = getTitleStyle(
      bestColor,
      ownerAttendee?.partstat,
      calendar
    );
    const cardStyle = getCardStyle(
      bestColor,
      ownerAttendee?.partstat,
      calendar
    );

    // Icon display configuration
    const IconDisplayed: IconDisplayConfig = {
      declined: ownerAttendee?.partstat === "DECLINED",
      tentative: ownerAttendee?.partstat === "TENTATIVE",
      needAction: ownerAttendee?.partstat === "NEEDS-ACTION",
      recurrent: isRecurrent,
      private: isPrivate,
    };

    // View and time calculations
    const isMonthView = arg.view.type === "dayGridMonth";
    const timeZone = arg.view.calendar?.getOption("timeZone") || "local";
    const { startTime, endTime } = getEventTimes(event, timeZone);
    const eventLength = getEventDuration(event);

    const isMoreThan15 = eventLength > EVENT_DURATION.SHORT;
    const isMoreThan30 = eventLength > EVENT_DURATION.MEDIUM;
    const isMoreThan60 = eventLength > EVENT_DURATION.LONG;

    // Organizer avatar
    const OrganizerAvatar = event._def.extendedProps.organizer
      ? stringAvatar(
          event._def.extendedProps.organizer?.cn ??
            event._def.extendedProps.organizer?.cal_address
        )
      : { style: {}, children: null };

    return (
      <Card
        variant="outlined"
        style={
          !isMoreThan15 || isMonthView
            ? { ...cardStyle, height: "auto" }
            : cardStyle
        }
        ref={cardRef}
      >
        <CardHeader
          title={
            showCompact ? (
              <Typography
                variant="body2"
                style={
                  !isMoreThan15 || isMonthView
                    ? { ...titleStyle, fontSize: "11px" }
                    : titleStyle
                }
              >
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
                  {isMoreThan30 && DisplayedIcons(IconDisplayed, false)}
                  {!isMoreThan30 && (
                    <Typography
                      variant="body2"
                      style={{
                        ...titleStyle,
                        overflow: "visible",
                        fontSize:
                          !isMoreThan15 || isMonthView
                            ? "11px"
                            : titleStyle.fontSize,
                        marginRight: "10px",
                      }}
                    >
                      {startTime}
                    </Typography>
                  )}
                  <Typography
                    variant="body2"
                    noWrap
                    style={{
                      ...titleStyle,
                      marginLeft: isMoreThan30 ? 0.5 : 0,
                      fontSize:
                        !isMoreThan15 || isMonthView
                          ? "11px"
                          : titleStyle.fontSize,
                    }}
                  >
                    {event.title}
                  </Typography>
                </Box>

                {!isMoreThan30 && DisplayedIcons(IconDisplayed, true)}
              </Box>
            )
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
            py: !isMoreThan15 || isMonthView ? "0px" : "2px",
            px: "5px",
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
    return (
      <ErrorEventChip event={event} errorHandler={errorHandler} error={e} />
    );
  }
}
