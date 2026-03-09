import { userAttendee } from "@/features/User/models/attendee";
import { createAttendee } from "@/features/User/models/attendee.mapper";
import { useRef, useState } from "react";
import { FreeBusyIndicator } from "./FreeBusyIndicator";
import {
  ExtendedAutocompleteRenderInputParams,
  PeopleSearch,
  User,
} from "./PeopleSearch";
import { useAttendeesFreeBusy } from "./useFreeBusy";

const attendeeToUser = (a: userAttendee, openpaasId = ""): User => ({
  email: a.cal_address,
  displayName: a.cn ?? "",
  avatarUrl: "",
  openpaasId,
});

export default function AttendeeSearch({
  attendees,
  setAttendees,
  disabled,
  inputSlot,
  placeholder,
  start,
  end,
  timezone,
  eventUid,
}: {
  attendees: userAttendee[];
  setAttendees: (attendees: userAttendee[]) => void;
  disabled?: boolean;
  inputSlot?: (
    params: ExtendedAutocompleteRenderInputParams
  ) => React.ReactNode;
  placeholder?: string;
  start?: string;
  end?: string;
  timezone?: string;
  eventUid?: string | null;
}) {
  const [userIdMap, setUserIdMap] = useState<Record<string, string>>({});

  const [addedUsers, setAddedUsers] = useState<User[]>([]);

  const initialEmailsRef = useRef<Set<string> | null>(null);
  if (initialEmailsRef.current === null && attendees.length > 0) {
    initialEmailsRef.current = new Set(attendees.map((a) => a.cal_address));
  }
  const initialEmails = initialEmailsRef.current ?? new Set<string>();

  const selectedUsers: User[] = [
    ...attendees.map((a) => attendeeToUser(a, userIdMap[a.cal_address])),
    ...addedUsers.filter(
      (u) => !attendees.find((a) => a.cal_address === u.email)
    ),
  ];

  const toAttendee = (u: User) => ({
    email: u.email,
    userId: u.openpaasId || userIdMap[u.email] || null,
  });

  const existingAttendees = selectedUsers
    .filter((u) => initialEmails.has(u.email))
    .map(toAttendee);
  const newAttendees = selectedUsers
    .filter((u) => !initialEmails.has(u.email))
    .map(toAttendee);

  const freeBusyMap = useAttendeesFreeBusy({
    existingAttendees,
    newAttendees,
    start: start ?? "",
    end: end ?? "",
    timezone: timezone ?? "",
    eventUid,
    enabled: !!(start && end && selectedUsers.length > 0),
  });

  return (
    <PeopleSearch
      selectedUsers={selectedUsers}
      objectTypes={["user", "contact"]}
      disabled={disabled}
      inputSlot={inputSlot}
      placeholder={placeholder}
      getChipIcon={
        start && end
          ? (user) => (
              <FreeBusyIndicator
                status={freeBusyMap[user.email] ?? "unknown"}
                size={16}
              />
            )
          : undefined
      }
      onChange={(_event, value: User[]) => {
        setUserIdMap((prev) => {
          const next = { ...prev };
          for (const u of value) {
            if (u.openpaasId && u.email) next[u.email] = u.openpaasId;
          }
          return next;
        });
        // Track only users not in the original attendees prop
        setAddedUsers(value.filter((u) => !initialEmails.has(u.email)));
        setAttendees(
          value.map((attendee: User) =>
            createAttendee({
              cal_address: attendee.email,
              cn: attendee.displayName,
            })
          )
        );
      }}
      freeSolo
    />
  );
}
