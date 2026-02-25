import { CalendarEvent } from "@/features/Events/EventsTypes";
import { updateAttendeesAfterTimeChange } from "@/features/Events/updateEventHelpers/updateAttendeesAfterTimeChange";
import { userAttendee } from "@/features/User/models/attendee";
import { userOrganiser } from "@/features/User/userDataTypes";

describe("updateAttendeesAfterTimeChange", () => {
  const mockAttendee: userAttendee = {
    cal_address: "attendee@example.com",
    partstat: "ACCEPTED",
    rsvp: "FALSE",
    role: "REQ-PARTICIPANT",
    cutype: "INDIVIDUAL",
    cn: "attendee",
  };

  const mockOrganizer: userOrganiser = {
    cn: "Organizer",
    cal_address: "organizer@example.com",
  };

  const organizerAttendee: userAttendee = {
    cal_address: "organizer@example.com",
    partstat: "ACCEPTED",
    rsvp: "FALSE",
    role: "CHAIR",
    cutype: "INDIVIDUAL",
    cn: "organizer",
  };

  const baseEvent: CalendarEvent = {
    uid: "test-event",
    URL: "/calendar/667037022b752d0026472254/cal1/test-event.ics",
    title: "Test Event",
    calId: "667037022b752d0026472254/cal1",
    start: "2025-01-15T07:00:00.000Z",
    end: "2025-01-15T08:00:00.000Z",
    allday: false,
    organizer: mockOrganizer,
    attendee: [mockAttendee, organizerAttendee],
    timezone: "ETC/UTC",
  };

  describe("early returns", () => {
    it("should return the event unchanged when attendee list is undefined", () => {
      const event = { ...baseEvent, attendee: undefined };
      const result = updateAttendeesAfterTimeChange(
        event as unknown as CalendarEvent
      );
      expect(result).toBe(event);
    });

    it("should NOT bail out early when organizer is undefined", () => {
      const event = { ...baseEvent, organizer: undefined };
      const result = updateAttendeesAfterTimeChange(event);
      expect(result.attendee).toBeDefined();
      expect(result.attendee).toHaveLength(2);
    });
  });

  describe("without provided attendees list", () => {
    it("should return attendees unchanged when timeChanged is false", () => {
      const result = updateAttendeesAfterTimeChange(baseEvent, false);
      expect(result.attendee?.[0].partstat).toBe("ACCEPTED");
      expect(result.attendee?.[0].rsvp).toBe("FALSE");
    });

    it("should mark non-organizer attendees as NEEDS-ACTION when timeChanged is true", () => {
      const result = updateAttendeesAfterTimeChange(baseEvent, true);
      const attendee = result.attendee?.find(
        (a) => a.cal_address === "attendee@example.com"
      );
      expect(attendee?.partstat).toBe("NEEDS-ACTION");
      expect(attendee?.rsvp).toBe("TRUE");
    });

    it("should NOT mark the organizer as NEEDS-ACTION when timeChanged is true", () => {
      const result = updateAttendeesAfterTimeChange(baseEvent, true);
      const organizer = result.attendee?.find(
        (a) => a.cal_address === "organizer@example.com"
      );
      expect(organizer?.partstat).toBe("ACCEPTED");
      expect(organizer?.rsvp).toBe("FALSE");
    });

    it("should return attendees unchanged when timeChanged is undefined", () => {
      const result = updateAttendeesAfterTimeChange(baseEvent);
      expect(result.attendee?.[0].partstat).toBe("ACCEPTED");
    });
  });

  describe("with provided attendees list", () => {
    const newAttendee: userAttendee = {
      cal_address: "new@example.com",
      partstat: "ACCEPTED",
      rsvp: "FALSE",
      role: "REQ-PARTICIPANT",
      cutype: "INDIVIDUAL",
      cn: "new",
    };

    it("should use existing attendee data when the address already exists in the event", () => {
      const result = updateAttendeesAfterTimeChange(baseEvent, false, [
        mockAttendee,
      ]);
      const attendee = result.attendee?.find(
        (a) => a.cal_address === "attendee@example.com"
      );
      expect(attendee?.partstat).toBe("ACCEPTED");
    });

    it("should mark new attendee as NEEDS-ACTION when not found in existing list", () => {
      const result = updateAttendeesAfterTimeChange(baseEvent, false, [
        newAttendee,
      ]);
      const attendee = result.attendee?.find(
        (a) => a.cal_address === "new@example.com"
      );
      expect(attendee?.partstat).toBe("NEEDS-ACTION");
      expect(attendee?.rsvp).toBe("TRUE");
    });

    it("should mark all attendees as NEEDS-ACTION when timeChanged is true", () => {
      const result = updateAttendeesAfterTimeChange(baseEvent, true, [
        mockAttendee,
        newAttendee,
      ]);
      const nonOrganizerAttendees = result.attendee?.filter(
        (a) => a.cal_address !== "organizer@example.com"
      );
      nonOrganizerAttendees?.forEach((a) => {
        expect(a.partstat).toBe("NEEDS-ACTION");
        expect(a.rsvp).toBe("TRUE");
      });
    });

    it("should append organizer entry at the end of the attendee list", () => {
      const result = updateAttendeesAfterTimeChange(baseEvent, false, [
        mockAttendee,
      ]);
      const last = result.attendee?.[result.attendee.length - 1];
      expect(last?.cal_address).toBe("organizer@example.com");
    });

    it("should use existing organizer attendee data when found in event attendees", () => {
      const result = updateAttendeesAfterTimeChange(baseEvent, false, [
        mockAttendee,
      ]);
      const organizer = result.attendee?.find(
        (a) => a.cal_address === "organizer@example.com"
      );
      expect(organizer?.partstat).toBe("ACCEPTED");
    });

    it("should fall back to organizer defaults when organizer is not in existing attendees", () => {
      const eventWithoutOrganizerInAttendees: CalendarEvent = {
        ...baseEvent,
        attendee: [mockAttendee], // organizer not in attendee list
      };
      const result = updateAttendeesAfterTimeChange(
        eventWithoutOrganizerInAttendees,
        false,
        [mockAttendee]
      );
      const organizer = result.attendee?.find(
        (a) => a.cal_address === "organizer@example.com"
      );
      expect(organizer?.role).toBe("CHAIR");
      expect(organizer?.partstat).toBe("NEEDS-ACTION");
    });
  });

  describe("organizer undefined", () => {
    const eventNoOrganizer: CalendarEvent = {
      ...baseEvent,
      organizer: undefined,
    };

    it("should return attendees without bailing out", () => {
      const result = updateAttendeesAfterTimeChange(eventNoOrganizer);
      expect(result.attendee).toHaveLength(2);
    });

    it("should mark attendees as NEEDS-ACTION when timeChanged is true", () => {
      const result = updateAttendeesAfterTimeChange(eventNoOrganizer, true);
      result.attendee?.forEach((a) => {
        expect(a.partstat).toBe("NEEDS-ACTION");
        expect(a.rsvp).toBe("TRUE");
      });
    });

    it("should not mutate attendees when timeChanged is false", () => {
      const result = updateAttendeesAfterTimeChange(eventNoOrganizer, false);
      expect(result.attendee?.[0].partstat).toBe("ACCEPTED");
      expect(result.attendee?.[0].rsvp).toBe("FALSE");
    });

    it("should not append an organizer entry when organizer is undefined and attendees list is provided", () => {
      const newAttendee: userAttendee = {
        cal_address: "new@example.com",
        partstat: "ACCEPTED",
        rsvp: "FALSE",
        role: "REQ-PARTICIPANT",
        cutype: "INDIVIDUAL",
        cn: "new",
      };
      const result = updateAttendeesAfterTimeChange(eventNoOrganizer, false, [
        newAttendee,
      ]);
      expect(result.attendee).toHaveLength(1);
      expect(result.attendee?.[0].cal_address).toBe("new@example.com");
    });
  });
});
