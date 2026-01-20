import { RootState } from "@/app/store";
import EventDuplication from "@/components/Event/EventDuplicate";
import EventPreviewModal from "@/features/Events/EventDisplayPreview";
import EventPopover from "@/features/Events/EventModal";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../utils/Renderwithproviders";

const day = new Date();
const preloadedState = {
  user: {
    userData: {
      sub: "test",
      email: "test@test.com",
      sid: "aiYbWZSk2g0F+LrQeD7Dg4QcUMR8R/zTZdZBiA7N6Ro",
      openpaasId: "667037022b752d0026472254",
    },
    organiserData: {
      cn: "test",
      cal_address: "mailto:test@test.com",
    },
  },
  calendars: {
    list: {
      "667037022b752d0026472254/cal1": {
        id: "667037022b752d0026472254/cal1",
        name: "Calendar",
        color: "#FF0000",
        events: {
          event1: {
            uid: "event1",
            URL: "calendars/667037022b752d0026472254/cal1/event1.ics",
            title: "Test Event",
            calId: "667037022b752d0026472254/cal1",
            start: day.toISOString(),
            end: day.toISOString(),
            timezone: "UTC",
            organizer: { cn: "test", cal_address: "test@test.com" },
            attendee: [
              {
                cn: "test",
                cal_address: "test@test.com",
                partstat: "NEEDS-ACTION",
                rsvp: "TRUE",
                role: "REQ-PARTICIPANT",
                cutype: "INDIVIDUAL",
              },
              {
                cn: "John",
                cal_address: "john@test.com",
                partstat: "NEEDS-ACTION",
                rsvp: "TRUE",
                role: "REQ-PARTICIPANT",
                cutype: "INDIVIDUAL",
              },
            ],
          },
        },
      },
    },
    pending: false,
  },
} as unknown as RootState;

describe("EventDuplication", () => {
  it("calls onOpenDuplicate when button clicked", () => {
    const handleClose = jest.fn();
    const onOpenDuplicate = jest.fn();
    renderWithProviders(
      <EventDuplication
        event={
          preloadedState.calendars.list["667037022b752d0026472254/cal1"].events
            .event1
        }
        onClose={handleClose}
        onOpenDuplicate={onOpenDuplicate}
      />,
      preloadedState
    );

    fireEvent.click(
      screen.getByRole("menuitem", { name: "eventDuplication.duplicateEvent" })
    );

    expect(onOpenDuplicate).toHaveBeenCalled();
  });
});

describe("EventPopover", () => {
  it("renders with event data", () => {
    renderWithProviders(
      <EventPopover
        anchorEl={null}
        open={true}
        onClose={jest.fn()}
        selectedRange={null}
        setSelectedRange={jest.fn()}
        calendarRef={{ current: null }}
        event={
          preloadedState.calendars.list["667037022b752d0026472254/cal1"].events
            .event1
        }
      />,
      preloadedState
    );

    expect(screen.getByDisplayValue(/Test Event/i)).toBeInTheDocument();
  });

  it("saves duplicated event when Save is clicked", () => {
    const onClose = jest.fn();

    renderWithProviders(
      <EventPopover
        anchorEl={null}
        open={true}
        onClose={onClose}
        selectedRange={null}
        setSelectedRange={jest.fn()}
        calendarRef={{ current: null }}
        event={
          preloadedState.calendars.list["667037022b752d0026472254/cal1"].events
            .event1
        }
      />,
      preloadedState
    );

    fireEvent.change(screen.getByLabelText(/Title/i), {
      target: { value: "Duplicated Event" },
    });
    fireEvent.click(screen.getByRole("button", { name: "actions.save" }));

    waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

describe("EventDisplayModal", () => {
  it("shows duplication button and opens duplication form", () => {
    renderWithProviders(
      <EventPreviewModal
        eventId="event1"
        calId="667037022b752d0026472254/cal1"
        open={true}
        onClose={jest.fn()}
      />,
      preloadedState
    );

    fireEvent.click(screen.getByTestId("MoreVertIcon"));
    fireEvent.click(
      screen.getByRole("menuitem", { name: "eventDuplication.duplicateEvent" })
    );
    expect(
      screen.getAllByText("eventDuplication.duplicateEvent")[1]
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(
        preloadedState.calendars.list["667037022b752d0026472254/cal1"].events
          .event1.title as string
      )
    ).toBeInTheDocument();
  });
});
