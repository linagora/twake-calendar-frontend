import { getCalendarVisibility } from "@/components/Calendar/utils/calendarUtils";
import { AclEntry } from "@/features/Calendars/types/CalendarData";

describe("getCalendarVisibility", () => {
  it("returns 'public' when {DAV:}authenticated has {DAV:}read", () => {
    const acl: AclEntry[] = [
      {
        privilege: "{DAV:}read",
        principal: "{DAV:}authenticated",
        protected: true,
      },
    ];
    expect(getCalendarVisibility(acl)).toBe("public");
  });

  it("returns 'private' when {DAV:}authenticated only has read-free-busy", () => {
    const acl: AclEntry[] = [
      {
        privilege: "{urn:ietf:params:xml:ns:caldav}read-free-busy",
        principal: "{DAV:}authenticated",
        protected: true,
      },
    ];
    expect(getCalendarVisibility(acl)).toBe("private");
  });

  it("returns 'private' when {DAV:}authenticated is not present", () => {
    const acl: AclEntry[] = [
      {
        privilege: "{DAV:}read",
        principal: "principals/users/123",
        protected: true,
      },
    ];
    expect(getCalendarVisibility(acl)).toBe("private");
  });

  it("ignores non-authenticated principals and still returns 'private'", () => {
    const acl: AclEntry[] = [
      {
        privilege: "{DAV:}read",
        principal: "principals/users/other",
        protected: true,
      },
      {
        privilege: "{DAV:}write",
        principal: "principals/users/other",
        protected: true,
      },
    ];
    expect(getCalendarVisibility(acl)).toBe("private");
  });

  it("stops early when it finds a {DAV:}read for {DAV:}authenticated", () => {
    const acl: AclEntry[] = [
      {
        privilege: "{DAV:}read",
        principal: "{DAV:}authenticated",
        protected: true,
      },
      {
        privilege: "{DAV:}write",
        principal: "{DAV:}authenticated",
        protected: true,
      },
    ];
    expect(getCalendarVisibility(acl)).toBe("public");
  });
});
