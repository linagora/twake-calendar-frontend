import * as eventThunks from "@/features/Calendars/services";
import EventUpdateModal from "@/features/Events/EventUpdateModal";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../utils/Renderwithproviders";

describe("Event Full Display — delegated calendar move", () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const testDate = new Date("2025-01-15T10:00:00.000Z");
  const testEndDate = new Date("2025-01-15T11:00:00.000Z");

  const baseUserState = {
    user: {
      userData: {
        sub: "test",
        email: "test@test.com",
        sid: "aiYbWZSk2g0F+LrQeD7Dg4QcUMR8R/zTZdZBiA7N6Ro",
        openpaasId: "user1",
      },
      organiserData: {
        cn: "test",
        cal_address: "test@test.com",
      },
    },
  };

  const preloadedDelegatedCals = {
    ...baseUserState,
    calendars: {
      pending: false,
      list: {
        "user1/cal1": {
          id: "user1/cal1",
          name: "Calendar One",
          color: "#FF0000",
          events: {
            event1: {
              uid: "event1",
              title: "Test Event",
              calId: "user1/cal1",
              start: testDate.toISOString(),
              end: testEndDate.toISOString(),
              organizer: { cn: "test", cal_address: "test@test.com" },
              attendee: [{ cn: "test", cal_address: "test@test.com" }],
              URL: "/calendar/user1/cal1/event1.ics",
            },
            link: "/calendar/user1/cal1.json",
          },
        },
        "user2/cal2": {
          id: "user2/cal2",
          name: "Delegated Calendar",
          color: "#00FF00",
          delegated: true,
          owner: {
            emails: ["delegate@test.com"],
            name: "Delegate User",
          },
          events: {},
          link: "/calendar/user2/cal2.json",
        },
      },
    },
  };

  it("calls deleteEventAsync and putEventAsync — and NOT moveEventAsync — when moving to a delegated calendar", async () => {
    const spyPut = jest
      .spyOn(eventThunks, "putEventAsync")
      .mockImplementation((payload) => {
        const promise = Promise.resolve(payload);
        (promise as any).unwrap = () => promise;
        return () => promise as any;
      });
    const spyDelete = jest
      .spyOn(eventThunks, "deleteEventAsync")
      .mockImplementation((payload) => {
        const promise = Promise.resolve(payload);
        (promise as any).unwrap = () => promise;
        return () => promise as any;
      });
    const spyMove = jest
      .spyOn(eventThunks, "moveEventAsync")
      .mockImplementation((payload) => {
        const promise = Promise.resolve(payload);
        (promise as any).unwrap = () => promise;
        return () => promise as any;
      });

    await act(async () =>
      renderWithProviders(
        <EventUpdateModal
          open={true}
          onClose={mockOnClose}
          calId={"user1/cal1"}
          eventId={"event1"}
        />,
        preloadedDelegatedCals
      )
    );

    fireEvent.click(screen.getByRole("button", { name: "common.moreOptions" }));

    const calendarSelect = screen.getByLabelText("event.form.calendar");
    await act(async () => fireEvent.mouseDown(calendarSelect));
    const option = await screen.findByText("Delegated Calendar");
    fireEvent.click(option);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "actions.save" }));
    });
    await waitFor(
      () => {
        expect(spyPut).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );
    await waitFor(
      () => {
        expect(spyDelete).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    expect(spyMove).not.toHaveBeenCalled();
  });
});
