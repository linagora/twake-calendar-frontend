import { userAttendee } from "@/src/features/User/models/attendee";

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
