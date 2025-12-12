import { useEffect, useState } from "react";
import { userAttendee } from "../../features/User/userDataTypes";
import { PeopleSearch, User } from "./PeopleSearch";

export default function UserSearch({
  attendees,
  setAttendees,
  disabled,
  small,
}: {
  attendees: userAttendee[];
  setAttendees: Function;
  disabled?: boolean;
  small?: boolean;
}) {
  const [selectedUsers, setSelectedUsers] = useState(
    attendees.map((a) => ({
      email: a.cal_address,
      displayName: a.cn ?? "",
      avatarUrl: "",
      openpaasId: "",
    })) ?? []
  );
  useEffect(() => {
    setSelectedUsers(
      attendees.map((a) => ({
        email: a.cal_address,
        displayName: a.cn ?? "",
        avatarUrl: "",
        openpaasId: "",
      }))
    );
  }, [attendees]);
  return (
    <>
      <PeopleSearch
        selectedUsers={selectedUsers}
        objectTypes={["user", "contact"]}
        disabled={disabled}
        small={small}
        onChange={(event: any, value: User[]) => {
          setAttendees(
            value.map((a: User) => ({
              cn: a.displayName,
              cal_address: a.email,
              partstat: "NEED_ACTION",
              rsvp: "FALSE",
              role: "REQ-PARTICIPANT",
              cutype: "INDIVIDUAL",
            }))
          );
          setSelectedUsers(value);
        }}
        freeSolo
      />
    </>
  );
}
