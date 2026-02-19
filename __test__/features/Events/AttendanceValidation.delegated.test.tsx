import { Calendar } from "@/features/Calendars/CalendarTypes";
import { AttendanceValidation } from "@/features/Events/AttendanceValidation/AttendanceValidation";
import { ContextualizedEvent } from "@/features/Events/EventsTypes";
import { userAttendee } from "@/features/User/models/attendee";
import { userData } from "@/features/User/userDataTypes";
import { render } from "@testing-library/react";

jest.mock("twake-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

jest.mock("@/app/hooks", () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: jest.fn(),
}));

const makeUser = (email: string): userData => ({
  email,
  given_name: "Alice",
  family_name: "User",
  name: "Alice User",
  sid: "user1",
  sub: "user1",
});

const makeContext = (
  overrides: Partial<ContextualizedEvent> = {}
): ContextualizedEvent =>
  ({
    event: {
      uid: "event-1",
      calId: "user1/cal1",
      title: "Test",
      start: "2024-01-15T10:00:00",
      end: "2024-01-15T11:00:00",
      organizer: { cal_address: "owner@example.com" },
      attendee: [
        { cal_address: "owner@example.com", partstat: "NEEDS-ACTION" },
      ],
    },
    calendar: {
      id: "user1/cal1",
      name: "Test",
      delegated: false,
      owner: { emails: ["alice@example.com"] },
      events: {},
    },
    currentUserAttendee: {
      cal_address: "alice@example.com",
      partstat: "NEEDS-ACTION",
    },
    isOwn: true,
    isOrganizer: false,
    isRecurring: false,
    ...overrides,
  }) as unknown as ContextualizedEvent;

const noopSetFunc = jest.fn();

describe("AttendanceValidation - delegation", () => {
  describe("non-delegated calendar", () => {
    it("renders when isOwn and currentUserAttendee exists", () => {
      const { container } = render(
        <AttendanceValidation
          contextualizedEvent={makeContext({ isOwn: true })}
          user={makeUser("alice@example.com")}
          setAfterChoiceFunc={noopSetFunc}
          setOpenEditModePopup={noopSetFunc}
        />
      );
      expect(container.firstChild).not.toBeNull();
    });

    it("returns null when not isOwn and not delegated", () => {
      const { container } = render(
        <AttendanceValidation
          contextualizedEvent={makeContext({ isOwn: false })}
          user={makeUser("other@example.com")}
          setAfterChoiceFunc={noopSetFunc}
          setOpenEditModePopup={noopSetFunc}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe("delegated calendar", () => {
    const delegatedContext = makeContext({
      isOwn: false, // logged-in user is not the owner
      calendar: {
        id: "user2/cal1",
        name: "Delegated Cal",
        delegated: true,
        owner: { emails: ["owner@example.com"] },
        events: {},
      } as Calendar,
      currentUserAttendee: {
        cal_address: "owner@example.com",
        partstat: "NEEDS-ACTION",
      } as userAttendee,
      event: { class: "PUBLIC" },
    });

    it("renders even when isOwn is false", () => {
      const { container } = render(
        <AttendanceValidation
          contextualizedEvent={delegatedContext}
          user={makeUser("alice@example.com")}
          setAfterChoiceFunc={noopSetFunc}
          setOpenEditModePopup={noopSetFunc}
        />
      );
      expect(container.firstChild).not.toBeNull();
    });

    it("renders regardless of currentUserAttendee presence", () => {
      const { container } = render(
        <AttendanceValidation
          contextualizedEvent={{
            ...delegatedContext,
            currentUserAttendee: undefined,
          }}
          user={makeUser("alice@example.com")}
          setAfterChoiceFunc={noopSetFunc}
          setOpenEditModePopup={noopSetFunc}
        />
      );
      // delegated flag alone should keep it visible
      expect(container.firstChild).not.toBeNull();
    });
  });
});
