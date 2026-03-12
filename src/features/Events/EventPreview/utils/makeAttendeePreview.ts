import { userAttendee } from "@/features/User/models/attendee";

export function makeAttendeePreview(
  attendees: userAttendee[] | undefined,
  t: (k: string, p?: string | object) => string
) {
  const attendeePreview = [];
  const counts = (attendees ?? []).reduce(
    (acc, a) => {
      if (a.partstat === "ACCEPTED") acc.yes++;
      else if (a.partstat === "DECLINED") acc.no++;
      else if (a.partstat === "TENTATIVE") acc.maybe++;
      else if (a.partstat === "NEEDS-ACTION") acc.needAction++;
      return acc;
    },
    { yes: 0, no: 0, maybe: 0, needAction: 0 }
  );
  const {
    yes: yesCount,
    no: noCount,
    maybe: maybeCount,
    needAction: needActionCount,
  } = counts;

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
