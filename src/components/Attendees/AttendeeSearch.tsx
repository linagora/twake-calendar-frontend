import { useEffect, useState } from "react";
import { userAttendee } from "../../features/User/models/attendee";
import { createAttendee } from "../../features/User/models/attendee.mapper";
import {
  PeopleSearch,
  User,
  ExtendedAutocompleteRenderInputParams,
} from "./PeopleSearch";

export default function UserSearch({
  attendees,
  setAttendees,
  disabled,
  inputSlot,
}: {
  attendees: userAttendee[];
  setAttendees: Function;
  disabled?: boolean;
  inputSlot?: (
    params: ExtendedAutocompleteRenderInputParams
  ) => React.ReactNode;
}) {
  const [selectedUsers, setSelectedUsers] = useState(
    attendees.map((attendee) => ({
      email: attendee.cal_address,
      displayName: attendee.cn ?? "",
      avatarUrl: "",
      openpaasId: "",
    })) ?? []
  );
  useEffect(() => {
    setSelectedUsers(
      attendees.map((attendee) => ({
        email: attendee.cal_address,
        displayName: attendee.cn ?? "",
        avatarUrl: "",
        openpaasId: "",
      }))
    );
  }, [attendees]);
  return (
    <PeopleSearch
      selectedUsers={selectedUsers}
      objectTypes={["user", "contact"]}
      disabled={disabled}
      inputSlot={inputSlot}
      onChange={(event: any, value: User[]) => {
        setAttendees(
          value.map((attendee: User) =>
            createAttendee({
              cal_address: attendee.email,
              cn: attendee.displayName,
            })
          )
        );
        setSelectedUsers(value);
      }}
      freeSolo
    />
  );
}
