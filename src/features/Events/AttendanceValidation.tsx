import { Box, Typography } from "@mui/material";
import { Button } from "@mui/material";
import { handleRSVP } from "../../components/Event/eventHandlers/eventHandlers";
import { CalendarEvent } from "./EventsTypes";
import { userData } from "../User/userDataTypes";
import { Calendars } from "../Calendars/CalendarTypes";
import { AppDispatch } from "../../app/store";
import { SetStateAction } from "react";
import { Dispatch } from "react";
import { userAttendee } from "../User/models/attendee";

export function AttendanceValidation(
  currentUserAttendee: userAttendee | undefined,
  hasNoAttendeesOrOrganizer: boolean,
  isOwn: boolean | undefined,
  t: (key: string) => string,
  isRecurring: boolean,
  setAfterChoiceFunc: Dispatch<SetStateAction<Function | undefined>>,
  dispatch: AppDispatch,
  calendar: Calendars,
  user: userData,
  event: CalendarEvent,
  calendarList: Calendars[],
  setOpenEditModePopup: Dispatch<SetStateAction<string | null>>
) {
  if (!((currentUserAttendee || hasNoAttendeesOrOrganizer) && isOwn)) {
    return;
  }
  return (
    <>
      <>
        <Typography sx={{ marginRight: 2 }}>
          {t("eventPreview.attendingQuestion")}
        </Typography>
        <Box display="flex" gap="15px" alignItems="center">
          <Button
            variant={
              currentUserAttendee?.partstat === "ACCEPTED"
                ? "contained"
                : "outlined"
            }
            color={
              currentUserAttendee?.partstat === "ACCEPTED"
                ? "success"
                : "primary"
            }
            size="large"
            sx={{ borderRadius: "50px" }}
            onClick={() => {
              if (isRecurring) {
                setAfterChoiceFunc(
                  () => (type: string) =>
                    handleRSVP(
                      dispatch,
                      calendar,
                      user,
                      event,
                      "ACCEPTED",
                      type,
                      calendarList
                    )
                );
                setOpenEditModePopup("attendance");
              } else {
                handleRSVP(dispatch, calendar, user, event, "ACCEPTED");
              }
            }}
          >
            {t("eventPreview.accept")}
          </Button>
          <Button
            variant={
              currentUserAttendee?.partstat === "TENTATIVE"
                ? "contained"
                : "outlined"
            }
            color={
              currentUserAttendee?.partstat === "TENTATIVE"
                ? "warning"
                : "primary"
            }
            size="large"
            sx={{ borderRadius: "50px" }}
            onClick={() => {
              if (isRecurring) {
                setAfterChoiceFunc(
                  () => (type: string) =>
                    handleRSVP(
                      dispatch,
                      calendar,
                      user,
                      event,
                      "TENTATIVE",
                      type,
                      calendarList
                    )
                );
                setOpenEditModePopup("attendance");
              } else {
                handleRSVP(dispatch, calendar, user, event, "TENTATIVE");
              }
            }}
          >
            {t("eventPreview.maybe")}
          </Button>
          <Button
            variant={
              currentUserAttendee?.partstat === "DECLINED"
                ? "contained"
                : "outlined"
            }
            color={
              currentUserAttendee?.partstat === "DECLINED" ? "error" : "primary"
            }
            size="large"
            sx={{ borderRadius: "50px" }}
            onClick={() => {
              if (isRecurring) {
                setAfterChoiceFunc(
                  () => (type: string) =>
                    handleRSVP(
                      dispatch,
                      calendar,
                      user,
                      event,
                      "DECLINED",
                      type,
                      calendarList
                    )
                );
                setOpenEditModePopup("attendance");
              } else {
                handleRSVP(dispatch, calendar, user, event, "DECLINED");
              }
            }}
          >
            {t("eventPreview.decline")}
          </Button>
        </Box>
      </>
    </>
  );
}
