import { useAttendeesFreeBusy } from "@/components/Attendees/useFreeBusy";
import { renderAttendeeBadge } from "@/components/Event/utils/eventUtils";
import { AvatarGroup, Box, Typography } from "@linagora/twake-mui";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import { alpha, useTheme } from "@mui/material/styles";
import { useState } from "react";
import { useI18n } from "twake-i18n";
import { makeAttendeePreview } from ".";
import { userAttendee } from "../../User/models/attendee";

interface EventPreviewAttendeesProps {
  attendees: userAttendee[];
  organizer: userAttendee | undefined;
  allAttendees: userAttendee[];
  start?: string;
  end?: string;
  timezone?: string;
  eventUid?: string | null;
}

const ATTENDEE_DISPLAY_LIMIT = 3;

export function EventPreviewAttendees({
  attendees,
  organizer,
  allAttendees,
  start,
  end,
  timezone,
  eventUid,
}: EventPreviewAttendeesProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const infoIconColor = alpha(theme.palette.grey[900], 0.9);
  const infoIconSx = { minWidth: "25px", marginRight: 2, color: infoIconColor };

  const [showAllAttendees, setShowAllAttendees] = useState(false);

  const attendeePreview = makeAttendeePreview(allAttendees, t);

  const toFreeBusyAttendee = (a: userAttendee) => ({
    email: a.cal_address,
    userId: null,
  });

  const freeBusyMap = useAttendeesFreeBusy({
    existingAttendees: allAttendees.map(toFreeBusyAttendee),
    newAttendees: [],
    start: start ?? "",
    end: end ?? "",
    timezone: timezone ?? "UTC",
    eventUid,
    enabled: !!(start && end && showAllAttendees),
  });

  const busyCaption = (a: userAttendee) =>
    freeBusyMap[a.cal_address] === "busy"
      ? t("event.freeBusy.busy")
      : undefined;

  return (
    <>
      <Box display="flex" alignItems="flex-start">
        <Box sx={{ ...infoIconSx, mt: 1 }}>
          <PeopleAltOutlinedIcon />
        </Box>
        <Box style={{ marginBottom: 1, display: "flex", flexDirection: "row" }}>
          <Box sx={{ marginRight: 2 }}>
            <Typography>
              {t("eventPreview.guests", { count: allAttendees.length })}
            </Typography>
            <Typography sx={{ fontSize: "13px", color: "text.secondary" }}>
              {attendeePreview}
            </Typography>
          </Box>
          {!showAllAttendees && (
            <AvatarGroup max={ATTENDEE_DISPLAY_LIMIT}>
              {organizer &&
                renderAttendeeBadge(
                  organizer,
                  "org",
                  t,
                  showAllAttendees,
                  true
                )}
              {attendees.map((a, idx) =>
                renderAttendeeBadge(a, idx.toString(), t, showAllAttendees)
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
            onClick={() => setShowAllAttendees((prev) => !prev)}
          >
            {showAllAttendees
              ? t("eventPreview.showLess")
              : t("eventPreview.showMore")}
          </Typography>
        </Box>
      </Box>

      {showAllAttendees &&
        organizer &&
        renderAttendeeBadge(
          organizer,
          "org",
          t,
          showAllAttendees,
          true,
          busyCaption(organizer)
        )}
      {showAllAttendees &&
        attendees.map((a, idx) =>
          renderAttendeeBadge(
            a,
            idx.toString(),
            t,
            showAllAttendees,
            false,
            busyCaption(a)
          )
        )}
    </>
  );
}
