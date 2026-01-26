import { userAttendee } from "@/features/User/models/attendee";
import { createAttendee } from "@/features/User/models/attendee.mapper";
import { useEffect, useState } from "react";
import {
  ExtendedAutocompleteRenderInputParams,
  PeopleSearch,
  User,
} from "./PeopleSearch";

export default function UserSearch({
  attendees,
  setAttendees,
  disabled,
  inputSlot,
  placeholder,
}: {
  attendees: userAttendee[];
  setAttendees: Function;
  disabled?: boolean;
  inputSlot?: (
    params: ExtendedAutocompleteRenderInputParams
  ) => React.ReactNode;
  placeholder?: string;
}) {
  const [selectedUsers, setSelectedUsers] = useState<User[]>(
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
      placeholder={placeholder}
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
