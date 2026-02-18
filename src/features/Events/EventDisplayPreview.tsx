/* eslint-disable react-hooks/rules-of-hooks */
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { CalendarName } from "@/components/Calendar/CalendarName";
import { formatEventChipTitle } from "@/components/Calendar/utils/calendarUtils";
import ResponsiveDialog from "@/components/Dialog/ResponsiveDialog";
import { EditModeDialog } from "@/components/Event/EditModeDialog";
import EventDuplication from "@/components/Event/EventDuplicate";
import { handleDelete } from "@/components/Event/eventHandlers/eventHandlers";
import { InfoRow } from "@/components/Event/InfoRow";
import { renderAttendeeBadge } from "@/components/Event/utils/eventUtils";
import { getEffectiveEmail } from "@/utils/getEffectiveEmail";
import { isEventOrganiser } from "@/utils/isEventOrganiser";
import { browserDefaultTimeZone, getTimezoneOffset } from "@/utils/timezone";
import { DateSelectArg } from "@fullcalendar/core";
import {
  AvatarGroup,
  Box,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  useTheme,
} from "@linagora/twake-mui";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CircleIcon from "@mui/icons-material/Circle";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import LockOutlineIcon from "@mui/icons-material/LockOutline";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import RepeatIcon from "@mui/icons-material/Repeat";
import SubjectIcon from "@mui/icons-material/Subject";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import { alpha } from "@mui/material/styles";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "twake-i18n";
import { deleteEventAsync } from "../Calendars/services";
import { userAttendee } from "../User/models/attendee";
import { ToUserData } from "../User/type/OpenPaasUserData";
import { AttendanceValidation } from "./AttendanceValidation/AttendanceValidation";
import { createEventContext } from "./createEventContext";
import { dlEvent } from "./EventApi";
import EventPopover from "./EventModal";
import { CalendarEvent } from "./EventsTypes";
import EventUpdateModal from "./EventUpdateModal";

export default function EventPreviewModal({
  eventId,
  calId,
  tempEvent,
  open,
  onClose,
}: {
  eventId: string;
  calId: string;
  tempEvent?: boolean;
  open: boolean;
  onClose: (event: unknown, reason: "backdropClick" | "escapeKeyDown") => void;
}) {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const calendars = useAppSelector((state) => state.calendars);
  const timezone =
    useAppSelector((state) => state.settings.timeZone) ??
    browserDefaultTimeZone;

  const calendar = tempEvent
    ? calendars.templist[calId]
    : calendars.list[calId];
  const event = calendar?.events[eventId];
  const user = useAppSelector((state) => state.user.userData);
  const theme = useTheme();
  const infoIconColor = alpha(theme.palette.grey[900], 0.9);
  const infoIconSx = { minWidth: "25px", marginRight: 2, color: infoIconColor };
  if (!user) return null;

  const isRecurring = event?.uid?.includes("/");
  const isOwn = calendar.owner?.emails?.includes(user.email) ?? false;
  const isDelegated = calendar.delegated;
  const isWriteDelegated = (isDelegated && calendar.access?.write) ?? false;
  const effectiveEmail = getEffectiveEmail(
    calendar,
    isWriteDelegated,
    user.email
  );
  const isOrganizer = event.organizer
    ? isEventOrganiser(event, effectiveEmail)
    : isOwn;
  const isNotPrivate =
    event.class !== "PRIVATE" && event.class !== "CONFIDENTIAL";
  const [showAllAttendees, setShowAllAttendees] = useState(false);
  const [openUpdateModal, setOpenUpdateModal] = useState(false);
  const [openDuplicateModal, setOpenDuplicateModal] = useState(false);
  const [hidePreview, setHidePreview] = useState(false);
  const [openEditModePopup, setOpenEditModePopup] = useState<string | null>(
    null
  );
  const [typeOfAction, setTypeOfAction] = useState<"solo" | "all" | undefined>(
    undefined
  );
  const [afterChoiceFunc, setAfterChoiceFunc] = useState<
    ((type: "solo" | "all" | undefined) => void) | undefined
  >();
  const attendeePreview = makeAttendeePreview(event.attendee, t);
  const hasCheckedSessionStorageRef = useRef(false);

  const [toggleActionMenu, setToggleActionMenu] = useState<Element | null>(
    null
  );
  const mailSpaUrl = window.MAIL_SPA_URL ?? null;

  useEffect(() => {
    if (!event || !calendar) {
      onClose({}, "backdropClick");
    }
  }, [event, calendar, onClose]);

  // Check sessionStorage when component mounts or when open becomes true (only once per open)
  useEffect(() => {
    if (!open) {
      hasCheckedSessionStorageRef.current = false;
      return;
    }

    // Only check once when open becomes true
    if (hasCheckedSessionStorageRef.current) return;
    hasCheckedSessionStorageRef.current = true;

    const checkAndReopen = () => {
      try {
        const stored = sessionStorage.getItem("eventUpdateModalReopen");
        if (stored) {
          const data = JSON.parse(stored);

          // Check if stored data matches current preview
          // For recurring events, typeOfAction from sessionStorage should be used
          // Allow undefined to match undefined, or use stored typeOfAction if current is undefined
          const typeOfActionMatch =
            data.typeOfAction === typeOfAction ||
            (data.typeOfAction === undefined && typeOfAction === undefined) ||
            (data.typeOfAction !== undefined && typeOfAction === undefined); // Allow stored typeOfAction to match when current is undefined

          if (
            data.eventId === eventId &&
            data.calId === calId &&
            typeOfActionMatch
          ) {
            // Restore typeOfAction from sessionStorage if it exists
            if (data.typeOfAction !== undefined && typeOfAction === undefined) {
              setTypeOfAction(data.typeOfAction);
              // Open modal immediately with the typeOfAction from sessionStorage
              // Use setTimeout to ensure state is set before opening
              setTimeout(() => {
                setOpenUpdateModal(true);
                setHidePreview(true);
                sessionStorage.removeItem("eventUpdateModalReopen");
              }, 50);
            } else {
              // Small delay to ensure component is fully mounted
              setTimeout(() => {
                setOpenUpdateModal(true);
                setHidePreview(true);
                sessionStorage.removeItem("eventUpdateModalReopen");
              }, 100);
            }
          }
        }
      } catch {
        // Ignore sessionStorage errors
      }
    };

    checkAndReopen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, eventId, calId]); // Removed typeOfAction from dependencies to prevent re-checking when typeOfAction changes

  // Listen for eventUpdateModalReopen event to reopen update modal on API failure
  useEffect(() => {
    const handleUpdateModalReopen = (event: CustomEvent) => {
      const detail = event.detail;

      // Check if this event matches current preview
      // For recurring events, typeOfAction from event should be used
      // Allow undefined to match undefined, or use event typeOfAction if current is undefined
      const typeOfActionMatch =
        detail?.typeOfAction === typeOfAction ||
        (detail?.typeOfAction === undefined && typeOfAction === undefined) ||
        (detail?.typeOfAction !== undefined && typeOfAction === undefined); // Allow event typeOfAction to match when current is undefined
      if (
        detail?.eventId === eventId &&
        detail?.calId === calId &&
        typeOfActionMatch
      ) {
        // Restore typeOfAction from event if it exists
        if (detail?.typeOfAction !== undefined && typeOfAction === undefined) {
          setTypeOfAction(detail.typeOfAction);
          // Open modal immediately with the typeOfAction from event
          setTimeout(() => {
            setOpenUpdateModal(true);
            setHidePreview(true);
          }, 50);
        } else {
          setOpenUpdateModal(true);
          setHidePreview(true);
        }
        // Clear sessionStorage after reopening
        try {
          sessionStorage.removeItem("eventUpdateModalReopen");
        } catch {
          // Ignore sessionStorage errors
        }
      }
    };

    // Also check sessionStorage on mount or when eventId/calId changes
    const checkSessionStorage = () => {
      try {
        const stored = sessionStorage.getItem("eventUpdateModalReopen");
        if (stored) {
          const data = JSON.parse(stored);
          // Check if stored data matches current preview
          // For recurring events, typeOfAction from sessionStorage should be used
          // Allow undefined to match undefined, or use stored typeOfAction if current is undefined
          const typeOfActionMatch =
            data.typeOfAction === typeOfAction ||
            (data.typeOfAction === undefined && typeOfAction === undefined) ||
            (data.typeOfAction !== undefined && typeOfAction === undefined); // Allow stored typeOfAction to match when current is undefined
          if (
            data.eventId === eventId &&
            data.calId === calId &&
            typeOfActionMatch
          ) {
            // Restore typeOfAction from sessionStorage if it exists
            if (data.typeOfAction !== undefined && typeOfAction === undefined) {
              setTypeOfAction(data.typeOfAction);
              // Open modal immediately with the typeOfAction from sessionStorage
              setTimeout(() => {
                setOpenUpdateModal(true);
                setHidePreview(true);
                sessionStorage.removeItem("eventUpdateModalReopen");
              }, 50);
            } else {
              setOpenUpdateModal(true);
              setHidePreview(true);
              sessionStorage.removeItem("eventUpdateModalReopen");
            }
          }
        }
      } catch {
        // Ignore sessionStorage errors
      }
    };

    // Check on mount and when relevant props change
    checkSessionStorage();

    window.addEventListener(
      "eventUpdateModalReopen",
      handleUpdateModalReopen as EventListener
    );
    return () => {
      window.removeEventListener(
        "eventUpdateModalReopen",
        handleUpdateModalReopen as EventListener
      );
    };
  }, [eventId, calId, typeOfAction]);

  if (!event || !calendar) return null;

  const attendeeDisplayLimit = 3;

  const attendees =
    event.attendee?.filter(
      (a) => a.cal_address !== event.organizer?.cal_address
    ) || [];

  const currentUserAttendee = event.attendee?.find(
    (person) => person.cal_address === user.email
  );
  const contextualizedEvent = createEventContext(event, calendar, user);

  const organizer = event.attendee?.find(
    (a) => a.cal_address === event.organizer?.cal_address
  );

  return (
    <>
      <ResponsiveDialog
        open={open && !hidePreview}
        onClose={() => onClose({}, "backdropClick")}
        showHeaderActions={false}
        actionsBorderTop={currentUserAttendee && isOwn}
        actionsJustifyContent="center"
        style={{ overflow: "auto" }}
        title={
          <Box
            display="flex"
            justifyContent="flex-end"
            alignItems="center"
            gap={0.5}
            width="100%"
          >
            {window.DEBUG && (
              <IconButton
                size="small"
                onClick={async () => {
                  let url: string | null = null;
                  try {
                    const icsContent = await dlEvent(event);
                    const blob = new Blob([icsContent], {
                      type: "text/calendar",
                    });
                    url = URL.createObjectURL(blob);

                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `${eventId}.ics`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  } catch (error) {
                    console.error("Failed to download ICS file:", error);
                  } finally {
                    if (url) URL.revokeObjectURL(url);
                  }
                }}
              >
                <FileDownloadOutlinedIcon />
              </IconButton>
            )}
            {isOrganizer && (isOwn || (isWriteDelegated && isNotPrivate)) && (
              <IconButton
                size="small"
                onClick={() => {
                  if (isRecurring) {
                    setAfterChoiceFunc(() => () => {
                      setHidePreview(true);
                      setOpenUpdateModal(true);
                    });
                    setOpenEditModePopup("edit");
                  } else {
                    setHidePreview(true);
                    setOpenUpdateModal(true);
                  }
                }}
              >
                <EditIcon />
              </IconButton>
            )}
            {((isNotPrivate && !isOwn) || isOwn) && (
              <IconButton
                size="small"
                onClick={(e) => setToggleActionMenu(e.currentTarget)}
              >
                <MoreVertIcon />
              </IconButton>
            )}
            <Menu
              open={Boolean(toggleActionMenu)}
              onClose={() => setToggleActionMenu(null)}
              anchorEl={toggleActionMenu}
            >
              {mailSpaUrl && attendees.length > 0 && (
                <MenuItem
                  onClick={() =>
                    window.open(
                      `${mailSpaUrl}/mailto/?uri=mailto:${event.attendee
                        .map((a) => a.cal_address)
                        .filter((mail) => mail !== user.email)
                        .join(
                          ","
                        )}&subject=${encodeURIComponent(event.title ?? "")}`
                    )
                  }
                >
                  {t("eventPreview.emailAttendees")}
                </MenuItem>
              )}
              <EventDuplication
                onOpenDuplicate={() => {
                  setToggleActionMenu(null);
                  setHidePreview(true);
                  setOpenDuplicateModal(true);
                }}
              />
              {(isOwn || isWriteDelegated) && (
                <MenuItem
                  onClick={async () => {
                    if (isRecurring) {
                      setAfterChoiceFunc(
                        () => (typeOfAction?: "solo" | "all" | undefined) =>
                          handleDelete(
                            isRecurring,
                            typeOfAction,
                            onClose,
                            dispatch,
                            calendar,
                            event,
                            calId,
                            eventId
                          )
                      );
                      setOpenEditModePopup("delete");
                    } else {
                      onClose({}, "backdropClick");
                      try {
                        const result = await dispatch(
                          deleteEventAsync({
                            calId,
                            eventId,
                            eventURL: event.URL,
                          })
                        );

                        // For compatibility with tests that may not mock unwrap
                        if (result && typeof result.unwrap === "function") {
                          await result.unwrap();
                        }
                      } catch (error) {
                        console.error("Failed to delete event:", error);
                      }
                    }
                  }}
                >
                  {t("eventPreview.deleteEvent")}
                </MenuItem>
              )}
            </Menu>
            <IconButton
              size="small"
              onClick={() => onClose({}, "backdropClick")}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        }
        actions={
          <AttendanceValidation
            contextualizedEvent={contextualizedEvent}
            user={
              isWriteDelegated && calendar.owner
                ? ToUserData(calendar.owner)
                : user
            }
            setAfterChoiceFunc={setAfterChoiceFunc}
            setOpenEditModePopup={setOpenEditModePopup}
          />
        }
      >
        <Box mb={3}>
          <Box
            display="flex"
            flexDirection="row"
            alignItems="center"
            gap={1}
            mb={1}
          >
            {event.class === "PRIVATE" &&
              (isOwn ? (
                <Tooltip
                  title={t("eventPreview.privateEvent.tooltipOwn")}
                  placement="top"
                >
                  <LockOutlineIcon sx={{ color: infoIconColor }} />
                </Tooltip>
              ) : (
                <LockOutlineIcon sx={{ color: infoIconColor }} />
              ))}
            <Typography
              variant="h5"
              sx={{
                fontSize: "24px",
                fontWeight: 600,
                wordBreak: "break-word",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {formatEventChipTitle(event, t)}
            </Typography>
            {event.transp === "TRANSPARENT" && (
              <Tooltip title={t("eventPreview.free.tooltip")} placement="top">
                <Chip
                  icon={<CircleIcon color="success" fontSize="small" />}
                  label={t("eventPreview.free.label")}
                />
              </Tooltip>
            )}
          </Box>
          <Typography color="text.secondaryContainer">
            {formatDate(event.start, t, timezone, event.allday)}
            {event.end &&
              formatEnd(event.start, event.end, t, timezone, event.allday) &&
              ` – ${formatEnd(event.start, event.end, t, timezone, event.allday)} ${!event.allday ? getTimezoneOffset(timezone, new Date(event.start)) : ""}`}
          </Typography>
        </Box>
        {((isNotPrivate && !isOwn) || isOwn) && (
          <>
            {/* Video */}
            {event.x_openpass_videoconference && (
              <InfoRow
                alignItems="flex-start"
                icon={
                  <Box sx={{ ...infoIconSx, mt: 1 }}>
                    <VideocamOutlinedIcon />
                  </Box>
                }
                content={
                  <Button
                    variant="contained"
                    size="medium"
                    onClick={() =>
                      window.open(event.x_openpass_videoconference)
                    }
                    sx={{ borderRadius: "4px" }}
                  >
                    {t("eventPreview.joinVideo")}
                  </Button>
                }
              />
            )}
            {/* Attendees */}
            {attendees?.length > 0 && (
              <>
                <InfoRow
                  alignItems="flex-start"
                  icon={
                    <Box sx={{ ...infoIconSx, mt: 1 }}>
                      <PeopleAltOutlinedIcon />
                    </Box>
                  }
                  content={
                    <Box
                      style={{
                        marginBottom: 1,
                        display: "flex",
                        flexDirection: "row",
                      }}
                    >
                      <Box sx={{ marginRight: 2 }}>
                        <Typography>
                          {t("eventPreview.guests", {
                            count: event.attendee.length,
                          })}
                        </Typography>
                        <Typography
                          sx={{ fontSize: "13px", color: "text.secondary" }}
                        >
                          {attendeePreview}
                        </Typography>
                      </Box>
                      {!showAllAttendees && (
                        <AvatarGroup max={attendeeDisplayLimit}>
                          {organizer &&
                            renderAttendeeBadge(
                              organizer,
                              "org",
                              t,
                              showAllAttendees,
                              true
                            )}
                          {attendees.map((a, idx) =>
                            renderAttendeeBadge(
                              a,
                              idx.toString(),
                              t,
                              showAllAttendees
                            )
                          )}
                        </AvatarGroup>
                      )}
                      <Typography
                        sx={{
                          cursor: "pointer",
                          marginLeft: 2,
                          fontSize: "14px",
                          color: "text.secondary",
                          alignSelf: "center",
                        }}
                        onClick={() => setShowAllAttendees(!showAllAttendees)}
                      >
                        {showAllAttendees
                          ? t("eventPreview.showLess")
                          : t("eventPreview.showMore")}
                      </Typography>
                    </Box>
                  }
                />
              </>
            )}
            {showAllAttendees &&
              organizer &&
              renderAttendeeBadge(organizer, "org", t, showAllAttendees, true)}
            {showAllAttendees &&
              attendees.map((a, idx) =>
                renderAttendeeBadge(a, idx.toString(), t, showAllAttendees)
              )}
            {/* Location */}
            {event.location && (
              <InfoRow
                alignItems="flex-start"
                icon={
                  <Box sx={infoIconSx}>
                    <LocationOnOutlinedIcon />
                  </Box>
                }
                text={event.location}
                style={{
                  fontSize: "16px",
                  fontFamily: "'Inter', sans-serif",
                }}
              />
            )}
            {/* Description */}
            {event.description && (
              <InfoRow
                alignItems="flex-start"
                icon={
                  <Box sx={infoIconSx}>
                    <SubjectIcon />
                  </Box>
                }
                text={event.description}
                style={{
                  fontSize: "16px",
                  fontFamily: "'Inter', sans-serif",
                }}
              />
            )}
            {/* ALARM */}
            {event.alarm && (
              <InfoRow
                alignItems="flex-start"
                icon={
                  <Box sx={infoIconSx}>
                    <NotificationsNoneIcon />
                  </Box>
                }
                text={t("eventPreview.alarmText", {
                  trigger: t(`event.form.notifications.${event.alarm.trigger}`),
                  action: (() => {
                    if (!event.alarm.action) return "";
                    const translationKey = `event.form.notifications.${event.alarm.action}`;
                    const translated = t(translationKey);
                    // If translation returns the key itself, it means translation not found, use raw value
                    return translated === translationKey
                      ? event.alarm.action
                      : translated;
                  })(),
                })}
                style={{
                  fontSize: "16px",
                  fontFamily: "'Inter', sans-serif",
                }}
              />
            )}
            {/* Repetition */}
            {event.repetition && (
              <InfoRow
                alignItems="flex-start"
                icon={
                  <Box sx={infoIconSx}>
                    <RepeatIcon />
                  </Box>
                }
                text={makeRecurrenceString(event, t)}
                style={{
                  fontSize: "16px",
                  fontFamily: "'Inter', sans-serif",
                }}
              />
            )}
          </>
        )}
        {!isNotPrivate && !isOwn && (
          <Box
            sx={{
              backgroundColor: "#F3F4F6",
              height: 48,
              borderRadius: "8px",
              gap: "16px",
              paddingTop: "16px",
              paddingBottom: " 16px",
            }}
          >
            <Typography
              fontFamily={"Inter"}
              fontWeight={500}
              fontSize={"12px"}
              lineHeight={"16px"}
              letterSpacing={"0.5px"}
              textAlign={"center"}
            >
              {t("eventPreview.privateEvent.hiddenDetails")}
            </Typography>
          </Box>
        )}
        {/* Error */}
        {event.error && (
          <InfoRow
            alignItems="flex-start"
            icon={
              <Box sx={infoIconSx}>
                <ErrorOutlineIcon color="error" />
              </Box>
            }
            text={event.error}
            style={{
              fontSize: "16px",
              fontFamily: "'Inter', sans-serif",
            }}
            error
          />
        )}
        {/* Calendar color dot */}
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 1,
            mb: 2,
          }}
        >
          <Box sx={infoIconSx}>
            <CalendarTodayIcon />
          </Box>
          <CalendarName calendar={calendar} />
        </Box>
      </ResponsiveDialog>
      <EditModeDialog
        type={openEditModePopup}
        setOpen={setOpenEditModePopup}
        eventAction={(type: "solo" | "all" | undefined) => {
          setTypeOfAction(type);
          if (afterChoiceFunc) {
            afterChoiceFunc(type);
          }
        }}
      />
      <EventUpdateModal
        open={openUpdateModal}
        onClose={() => {
          setOpenUpdateModal(false);
          setHidePreview(false);
        }}
        onCloseAll={() => {
          setOpenUpdateModal(false);
          onClose({}, "backdropClick");
        }}
        eventId={eventId}
        calId={calId}
        typeOfAction={(() => {
          // Get typeOfAction from state or sessionStorage
          if (typeOfAction) {
            return typeOfAction;
          }
          // Fallback: try to get typeOfAction from sessionStorage if state is not set yet
          try {
            const stored = sessionStorage.getItem("eventUpdateModalReopen");
            if (stored) {
              const data = JSON.parse(stored);
              if (
                data.eventId === eventId &&
                data.calId === calId &&
                data.typeOfAction
              ) {
                return data.typeOfAction;
              }
            }
          } catch {
            // Ignore
          }
          return undefined;
        })()}
      />
      <EventPopover
        anchorEl={null}
        open={openDuplicateModal}
        selectedRange={
          {
            start: new Date(event.start),
            startStr: event.start,
            end: new Date(event.end ?? ""),
            endStr: event.end ?? "",
            allDay: event.allday ?? false,
          } as DateSelectArg
        }
        setSelectedRange={() => {}}
        calendarRef={{ current: null }}
        onClose={() => {
          setOpenDuplicateModal(false);
          onClose({}, "backdropClick"); // Close preview modal as well
        }}
        event={event}
      />
    </>
  );
}

function makeRecurrenceString(
  event: CalendarEvent,
  t: (k: string, p?: string | object) => string
): string | undefined {
  if (!event.repetition) return;

  const recur: string[] = [
    `${t("eventPreview.recurrentEvent")} · ${t(
      `eventPreview.freq.${event.repetition.freq}`,
      event.repetition.freq
    )}`,
  ];

  const recurType: Record<string, string> = {
    daily: t("eventPreview.days"),
    monthly: t("eventPreview.months"),
    yearly: t("eventPreview.years"),
  };

  if (event.repetition.byday) {
    recur.push(
      t("eventPreview.recurrenceOnDays", {
        days: event.repetition.byday
          .map((s) => t(`eventPreview.onDays.${s}`))
          .join(", "),
      })
    );
  }
  if (event.repetition.interval && event.repetition.interval > 1) {
    recur.push(
      t("eventPreview.everyInterval", {
        interval: event.repetition.interval,
        unit: recurType[event.repetition.freq],
      })
    );
  }
  if (event.repetition.occurrences) {
    recur.push(
      t("eventPreview.forOccurrences", {
        count: event.repetition.occurrences,
      })
    );
  }
  if (event.repetition.endDate) {
    recur.push(
      t("eventPreview.until", {
        date: new Date(event.repetition.endDate).toLocaleDateString(
          t("locale"),
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          }
        ),
      })
    );
  }
  return recur.join(", ");
}

function formatDate(
  date: Date | string,
  t: (k: string, p?: string | object) => string,
  timeZone: string,
  allday?: boolean
) {
  if (allday) {
    return new Date(date).toLocaleDateString(t("locale"), {
      year: "numeric",
      month: "long",
      weekday: "long",
      day: "numeric",
      timeZone,
    });
  } else {
    return new Date(date).toLocaleString(t("locale"), {
      year: "numeric",
      month: "long",
      weekday: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    });
  }
}

function formatEnd(
  start: Date | string,
  end: Date | string,
  t: (k: string, p?: string | object) => string,
  timeZone: string,
  allday?: boolean
) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const formatDatePart = (d: Date) =>
    d.toLocaleDateString("en-CA", { timeZone }); // YYYY-MM-DD format
  if (allday) {
    const inclusiveEndDate = new Date(endDate);
    inclusiveEndDate.setDate(inclusiveEndDate.getDate() - 1);
    const sameDay =
      formatDatePart(startDate) === formatDatePart(inclusiveEndDate);
    return sameDay
      ? null
      : inclusiveEndDate.toLocaleDateString(t("locale"), {
          year: "numeric",
          month: "short",
          day: "numeric",
          timeZone,
        });
  } else {
    const sameDay = formatDatePart(startDate) === formatDatePart(endDate);
    if (sameDay) {
      return endDate.toLocaleTimeString(t("locale"), {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone,
      });
    }
    return endDate.toLocaleString(t("locale"), {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    });
  }
}

export function makeAttendeePreview(
  attendees: userAttendee[],
  t: (k: string, p?: string | object) => string
) {
  const attendeePreview = [];
  const yesCount = attendees?.filter((a) => a.partstat === "ACCEPTED").length;
  const noCount = attendees?.filter((a) => a.partstat === "DECLINED").length;
  const maybeCount = attendees?.filter(
    (a) => a.partstat === "TENTATIVE"
  ).length;
  const needActionCount = attendees?.filter(
    (a) => a.partstat === "NEEDS-ACTION"
  ).length;
  if (yesCount) {
    attendeePreview.push(t("eventPreview.yesCount", { count: yesCount }));
  }
  if (maybeCount) {
    attendeePreview.push(t("eventPreview.maybeCount", { count: maybeCount }));
  }
  if (needActionCount) {
    attendeePreview.push(
      t("eventPreview.needActionCount", { count: needActionCount })
    );
  }
  if (noCount) {
    attendeePreview.push(t("eventPreview.noCount", { count: noCount }));
  }
  return attendeePreview.join(", ");
}
