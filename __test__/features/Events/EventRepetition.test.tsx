import { screen, fireEvent, waitFor } from "@testing-library/react";
import * as eventThunks from "../../../src/features/Calendars/CalendarSlice";
import { renderWithProviders } from "../../utils/Renderwithproviders";
import EventDisplayModal from "../../../src/features/Events/EventDisplay";
import { EditModeDialog } from "../../../src/components/Event/EditModeDialog";
import * as EventApi from "../../../src/features/Events/EventApi";
import {
  createEventHandlers,
  EventHandlersProps,
} from "../../../src/components/Calendar/handlers/eventHandlers";
import EventPreviewModal from "../../../src/features/Events/EventDisplayPreview";

describe("Recurrence Event Behavior Tests", () => {
  const mockOnClose = jest.fn();
  const day = new Date("2025-03-15T10:00:00Z");

  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).MAIL_SPA_URL = null;
  });

  const basePreloadedState = {
    user: {
      userData: {
        sub: "test",
        email: "test@test.com",
        sid: "aiYbWZSk2g0F+LrQeD7Dg4QcUMR8R/zTZdZBiA7N6Ro",
        openpaasId: "667037022b752d0026472254",
      },
      organiserData: {
        cn: "test",
        cal_address: "test@test.com",
      },
    },
    calendars: {
      list: {
        "667037022b752d0026472254/cal1": {
          id: "667037022b752d0026472254/cal1",
          name: "Calendar",
          color: "#FF0000",
          events: {
            "recurring-base/20250315T100000": {
              uid: "recurring-base/20250315T100000",
              title: "Recurring Event Instance",
              calId: "667037022b752d0026472254/cal1",
              start: day.toISOString(),
              end: new Date("2025-03-15T11:00:00Z").toISOString(),
              organizer: { cn: "test", cal_address: "test@test.com" },
              recurrenceId: "20250315T100000",
              timezone: "UTC",
              URL: "/calendars/667037022b752d0026472254/cal1/recurring-base.ics",
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
            "recurring-base/20250322T100000": {
              uid: "recurring-base/20250322T100000",
              title: "Recurring Event Instance",
              calId: "667037022b752d0026472254/cal1",
              start: new Date("2025-03-22T10:00:00Z").toISOString(),
              end: new Date("2025-03-22T11:00:00Z").toISOString(),
              organizer: { cn: "test", cal_address: "test@test.com" },
              recurrenceId: "20250322T100000",
              timezone: "UTC",
              URL: "/calendars/667037022b752d0026472254/cal1/recurring-base.ics",
              attendee: [
                {
                  cn: "test",
                  cal_address: "test@test.com",
                  partstat: "NEEDS-ACTION",
                  rsvp: "TRUE",
                  role: "REQ-PARTICIPANT",
                  cutype: "INDIVIDUAL",
                },
              ],
            },
          },
          ownerEmails: ["test@test.com"],
        },
      },
      pending: false,
      templist: {},
    },
  };

  describe("EditModeDialog Component", () => {
    it("renders dialog when type is 'edit'", () => {
      const mockSetOpen = jest.fn();
      const mockEventAction = jest.fn();

      renderWithProviders(
        <EditModeDialog
          type="edit"
          setOpen={mockSetOpen}
          event={
            basePreloadedState.calendars.list["667037022b752d0026472254/cal1"]
              .events["recurring-base/20250315T100000"]
          }
          eventAction={mockEventAction}
        />,
        basePreloadedState
      );

      expect(
        screen.getByText("Update the reccurent event")
      ).toBeInTheDocument();
      expect(screen.getByText("This event")).toBeInTheDocument();
      expect(screen.getByText("All the events")).toBeInTheDocument();
    });

    it("renders dialog when type is 'attendance'", () => {
      const mockSetOpen = jest.fn();
      const mockEventAction = jest.fn();

      renderWithProviders(
        <EditModeDialog
          type="attendance"
          setOpen={mockSetOpen}
          event={
            basePreloadedState.calendars.list["667037022b752d0026472254/cal1"]
              .events["recurring-base/20250315T100000"]
          }
          eventAction={mockEventAction}
        />,
        basePreloadedState
      );

      expect(
        screen.getByText("Update the participation status")
      ).toBeInTheDocument();
    });

    it("calls eventAction with 'solo' when solo option is selected and Ok clicked", async () => {
      const mockSetOpen = jest.fn();
      const mockEventAction = jest.fn();

      renderWithProviders(
        <EditModeDialog
          type="edit"
          setOpen={mockSetOpen}
          event={
            basePreloadedState.calendars.list["667037022b752d0026472254/cal1"]
              .events["recurring-base/20250315T100000"]
          }
          eventAction={mockEventAction}
        />,
        basePreloadedState
      );

      fireEvent.click(screen.getByLabelText("This event"));
      fireEvent.click(screen.getByRole("button", { name: /Ok/i }));

      await waitFor(() => {
        expect(mockEventAction).toHaveBeenCalledWith("solo");
        expect(mockSetOpen).toHaveBeenCalledWith(null);
      });
    });

    it("calls eventAction with 'all' when all option is selected and Ok clicked", async () => {
      const mockSetOpen = jest.fn();
      const mockEventAction = jest.fn();

      renderWithProviders(
        <EditModeDialog
          type="edit"
          setOpen={mockSetOpen}
          event={
            basePreloadedState.calendars.list["667037022b752d0026472254/cal1"]
              .events["recurring-base/20250315T100000"]
          }
          eventAction={mockEventAction}
        />,
        basePreloadedState
      );

      fireEvent.click(screen.getByLabelText("All the events"));
      fireEvent.click(screen.getByRole("button", { name: /Ok/i }));

      await waitFor(() => {
        expect(mockEventAction).toHaveBeenCalledWith("all");
        expect(mockSetOpen).toHaveBeenCalledWith(null);
      });
    });

    it("calls setOpen with null when Cancel is clicked", async () => {
      const mockSetOpen = jest.fn();
      const mockEventAction = jest.fn();

      renderWithProviders(
        <EditModeDialog
          type="edit"
          setOpen={mockSetOpen}
          event={
            basePreloadedState.calendars.list["667037022b752d0026472254/cal1"]
              .events["recurring-base/20250315T100000"]
          }
          eventAction={mockEventAction}
        />,
        basePreloadedState
      );

      fireEvent.click(screen.getByText("Cancel"));

      await waitFor(() => {
        expect(mockSetOpen).toHaveBeenCalledWith(null);
        expect(mockEventAction).not.toHaveBeenCalled();
      });
    });
  });

  describe("EventPreviewModal - Recurring Event Interactions", () => {
    it("shows EditModeDialog when editing a recurring event", async () => {
      jest.spyOn(eventThunks, "getEventAsync").mockImplementation((payload) => {
        return () =>
          Promise.resolve({
            calId: payload.calId,
            event:
              basePreloadedState.calendars.list["667037022b752d0026472254/cal1"]
                .events["recurring-base/20250315T100000"],
          }) as any;
      });

      renderWithProviders(
        <EventPreviewModal
          open={true}
          onClose={mockOnClose}
          calId={"667037022b752d0026472254/cal1"}
          eventId={"recurring-base/20250315T100000"}
        />,
        basePreloadedState
      );

      fireEvent.click(screen.getByTestId("EditIcon"));

      await waitFor(() => {
        expect(
          screen.getByText("Update the reccurent event")
        ).toBeInTheDocument();
      });
    });

    it("shows EditModeDialog when deleting a recurring event", async () => {
      renderWithProviders(
        <EventPreviewModal
          open={true}
          onClose={mockOnClose}
          calId={"667037022b752d0026472254/cal1"}
          eventId={"recurring-base/20250315T100000"}
        />,
        basePreloadedState
      );

      fireEvent.click(screen.getByTestId("MoreVertIcon"));
      fireEvent.click(screen.getByRole("menuitem", { name: /Delete event/i }));

      await waitFor(() => {
        expect(
          screen.getByText("Update the reccurent event")
        ).toBeInTheDocument();
      });
    });

    it("shows EditModeDialog when RSVP to a recurring event", async () => {
      renderWithProviders(
        <EventPreviewModal
          open={true}
          onClose={mockOnClose}
          calId={"667037022b752d0026472254/cal1"}
          eventId={"recurring-base/20250315T100000"}
        />,
        basePreloadedState
      );

      fireEvent.click(screen.getByRole("button", { name: "Accept" }));

      await waitFor(() => {
        expect(
          screen.getByText("Update the participation status")
        ).toBeInTheDocument();
      });
    });

    it("does not show EditModeDialog for non-recurring events", async () => {
      const nonRecurringState = {
        ...basePreloadedState,
        calendars: {
          ...basePreloadedState.calendars,
          list: {
            "667037022b752d0026472254/cal1": {
              ...basePreloadedState.calendars.list[
                "667037022b752d0026472254/cal1"
              ],
              events: {
                "single-event": {
                  uid: "single-event",
                  title: "Single Event",
                  calId: "667037022b752d0026472254/cal1",
                  start: day.toISOString(),
                  end: new Date("2025-03-15T11:00:00Z").toISOString(),
                  organizer: { cn: "test", cal_address: "test@test.com" },
                  timezone: "UTC",
                  URL: "/calendars/667037022b752d0026472254/cal1/single-event.ics",
                  attendee: [],
                },
              },
            },
          },
        },
      };

      const spy = jest
        .spyOn(eventThunks, "deleteEventAsync")
        .mockImplementation((payload) => {
          return () => Promise.resolve(payload) as any;
        });

      renderWithProviders(
        <EventPreviewModal
          open={true}
          onClose={mockOnClose}
          calId={"667037022b752d0026472254/cal1"}
          eventId={"single-event"}
        />,
        nonRecurringState
      );

      fireEvent.click(screen.getByTestId("MoreVertIcon"));
      fireEvent.click(screen.getByRole("menuitem", { name: /Delete event/i }));

      await waitFor(() => {
        expect(spy).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });

      expect(
        screen.queryByText("Update the reccurent event")
      ).not.toBeInTheDocument();
    });
  });

  describe("Delete Recurring Event Instance", () => {
    it("calls deleteEventInstanceAsync when deleting single instance", async () => {
      const spy = jest
        .spyOn(eventThunks, "deleteEventInstanceAsync")
        .mockImplementation((payload) => {
          return () => Promise.resolve(payload) as any;
        });

      renderWithProviders(
        <EventPreviewModal
          open={true}
          onClose={mockOnClose}
          calId={"667037022b752d0026472254/cal1"}
          eventId={"recurring-base/20250315T100000"}
        />,
        basePreloadedState
      );

      fireEvent.click(screen.getByTestId("MoreVertIcon"));
      fireEvent.click(screen.getByRole("menuitem", { name: /Delete event/i }));

      await waitFor(() => {
        expect(
          screen.getByText("Update the reccurent event")
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText("This event"));
      fireEvent.click(screen.getByRole("button", { name: /Ok/i }));

      await waitFor(() => {
        expect(spy).toHaveBeenCalled();
      });

      const receivedPayload = spy.mock.calls[0][0];
      expect(receivedPayload.event.uid).toBe("recurring-base/20250315T100000");
    });

    it("calls deleteEventAsync when deleting all instances", async () => {
      jest.spyOn(EventApi, "getEvent").mockResolvedValue({
        ...basePreloadedState.calendars.list["667037022b752d0026472254/cal1"]
          .events["recurring-base/20250315T100000"],
        uid: "recurring-base",
      } as any);

      const spy = jest
        .spyOn(eventThunks, "deleteEventAsync")
        .mockImplementation((payload) => {
          return () => Promise.resolve(payload) as any;
        });

      renderWithProviders(
        <EventPreviewModal
          open={true}
          onClose={mockOnClose}
          calId={"667037022b752d0026472254/cal1"}
          eventId={"recurring-base/20250315T100000"}
        />,
        basePreloadedState
      );

      fireEvent.click(screen.getByTestId("MoreVertIcon"));
      fireEvent.click(screen.getByRole("menuitem", { name: /Delete event/i }));

      await waitFor(() => {
        expect(
          screen.getByText("Update the reccurent event")
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText("All the events"));
      fireEvent.click(screen.getByRole("button", { name: /Ok/i }));

      await waitFor(() => {
        expect(spy).toHaveBeenCalled();
      });

      const receivedPayload = spy.mock.calls[0][0];
      expect(receivedPayload.eventId).toBe("recurring-base/20250315T100000");
    });
  });

  describe("RSVP to Recurring Event", () => {
    it("calls updateEventInstanceAsync when accepting single instance", async () => {
      const spy = jest
        .spyOn(eventThunks, "updateEventInstanceAsync")
        .mockImplementation((payload) => {
          return () => Promise.resolve(payload) as any;
        });

      renderWithProviders(
        <EventPreviewModal
          open={true}
          onClose={mockOnClose}
          calId={"667037022b752d0026472254/cal1"}
          eventId={"recurring-base/20250315T100000"}
        />,
        basePreloadedState
      );

      fireEvent.click(screen.getByRole("button", { name: "Accept" }));

      await waitFor(() => {
        expect(
          screen.getByText("Update the participation status")
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText("This event"));
      fireEvent.click(screen.getByRole("button", { name: /Ok/i }));

      await waitFor(() => {
        expect(spy).toHaveBeenCalled();
      });

      const updatedEvent = spy.mock.calls[0][0].event;
      expect(updatedEvent.attendee[0].partstat).toBe("ACCEPTED");
    });

    it("calls updateSeriesPartstat when accepting all instances", async () => {
      const spy = jest
        .spyOn(EventApi, "updateSeriesPartstat")
        .mockResolvedValue({} as any);

      renderWithProviders(
        <EventPreviewModal
          open={true}
          onClose={mockOnClose}
          calId={"667037022b752d0026472254/cal1"}
          eventId={"recurring-base/20250315T100000"}
        />,
        basePreloadedState
      );

      fireEvent.click(screen.getByRole("button", { name: "Accept" }));

      await waitFor(() => {
        expect(
          screen.getByText("Update the participation status")
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText("All the events"));
      fireEvent.click(screen.getByRole("button", { name: /Ok/i }));

      await waitFor(() => {
        expect(spy).toHaveBeenCalled();
      });

      const callArgs = spy.mock.calls[0];
      expect(callArgs[0].uid).toBe("recurring-base/20250315T100000");
      expect(callArgs[1]).toBe("test@test.com");
      expect(callArgs[2]).toBe("ACCEPTED");
    });
  });

  describe("Edit Recurring Event in Full Display", () => {
    it("renders event with recurrenceId in URL", () => {
      renderWithProviders(
        <EventDisplayModal
          open={true}
          onClose={mockOnClose}
          calId={"667037022b752d0026472254/cal1"}
          eventId={"recurring-base/20250315T100000"}
        />,
        basePreloadedState
      );

      expect(
        screen.getByDisplayValue("Recurring Event Instance")
      ).toBeInTheDocument();
    });

    it("calls updateEventInstanceAsync when saving single instance with typeOfAction='solo'", async () => {
      const spy = jest
        .spyOn(eventThunks, "updateEventInstanceAsync")
        .mockImplementation((payload) => {
          return () => Promise.resolve(payload) as any;
        });

      renderWithProviders(
        <EventDisplayModal
          open={true}
          onClose={mockOnClose}
          calId={"667037022b752d0026472254/cal1"}
          eventId={"recurring-base/20250315T100000"}
          typeOfAction="solo"
        />,
        basePreloadedState
      );

      const titleField = screen.getByLabelText("Title");
      fireEvent.change(titleField, {
        target: { value: "Updated Single Instance" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Save/i }));

      await waitFor(() => {
        expect(spy).toHaveBeenCalled();
      });

      const updatedEvent = spy.mock.calls[0][0].event;
      expect(updatedEvent.title).toBe("Updated Single Instance");
      expect(updatedEvent.recurrenceId).toBe("20250315T100000");
    });

    it("calls updateSeriesAsync when saving all instances with typeOfAction='all'", async () => {
      const getEventSpy = jest.spyOn(EventApi, "getEvent").mockResolvedValue({
        ...basePreloadedState.calendars.list["667037022b752d0026472254/cal1"]
          .events["recurring-base/20250315T100000"],
        uid: "recurring-base",
      } as any);

      const spy = jest
        .spyOn(eventThunks, "updateSeriesAsync")
        .mockImplementation((payload) => {
          return () => Promise.resolve() as any;
        });

      renderWithProviders(
        <EventDisplayModal
          open={true}
          onClose={mockOnClose}
          calId={"667037022b752d0026472254/cal1"}
          eventId={"recurring-base/20250315T100000"}
          typeOfAction="all"
        />,
        basePreloadedState
      );

      await waitFor(() => {
        expect(getEventSpy).toHaveBeenCalled();
      });

      const titleField = screen.getByLabelText("Title");
      fireEvent.change(titleField, {
        target: { value: "Updated All Instances" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Save/i }));

      await waitFor(() => {
        expect(spy).toHaveBeenCalled();
      });

      const updatedEvent = spy.mock.calls[0][0].event;
      expect(updatedEvent.title).toBe("Updated All Instances");
    });

    it("disables repetition editing when typeOfAction='solo'", () => {
      renderWithProviders(
        <EventDisplayModal
          open={true}
          onClose={mockOnClose}
          calId={"667037022b752d0026472254/cal1"}
          eventId={"recurring-base/20250315T100000"}
          typeOfAction="solo"
        />,
        basePreloadedState
      );

      fireEvent.click(screen.getByRole("button", { name: /Show More/i }));

      expect(screen.getByText(/repeat every/i)).toBeInTheDocument();
      expect(screen.getByText(/end:/i)).toBeInTheDocument();

      const frequencySelect = screen.getByRole("radio", {
        name: /after \d occurrences/i,
      });
      expect(frequencySelect).toBeDisabled();
    });

    it("fetches master event data when typeOfAction='all'", async () => {
      const getEventSpy = jest.spyOn(EventApi, "getEvent").mockResolvedValue({
        ...basePreloadedState.calendars.list["667037022b752d0026472254/cal1"]
          .events["recurring-base/20250315T100000"],
        uid: "recurring-base",
        title: "Master Event Title",
        description: "Master Description",
      } as any);

      renderWithProviders(
        <EventDisplayModal
          open={true}
          onClose={mockOnClose}
          calId={"667037022b752d0026472254/cal1"}
          eventId={"recurring-base/20250315T100000"}
          typeOfAction="all"
        />,
        basePreloadedState
      );

      await waitFor(() => {
        expect(getEventSpy).toHaveBeenCalled();
        expect(
          screen.getByDisplayValue("Master Event Title")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Event Drag and Drop - Recurring Events", () => {
    it("shows EditModeDialog when dragging recurring event", () => {
      const mockDispatch = jest.fn();
      const mockSetSelectedEvent = jest.fn();
      const mockSetOpenEditModePopup = jest.fn();
      const mockSetAfterChoiceFunc = jest.fn();

      const eventHandlers = createEventHandlers({
        setSelectedRange: jest.fn(),
        setOpenEventModal: jest.fn(),
        setTempEvent: jest.fn(),
        setOpenEventDisplay: jest.fn(),
        dispatch: mockDispatch,
        calendarRange: { start: new Date(), end: new Date() },
        setEventDisplayedId: jest.fn(),
        setEventDisplayedCalId: jest.fn(),
        setEventDisplayedTemp: jest.fn(),
        calendars: basePreloadedState.calendars.list,
        setSelectedEvent: mockSetSelectedEvent,
        setAfterChoiceFunc: mockSetAfterChoiceFunc,
        setOpenEditModePopup: mockSetOpenEditModePopup,
      } as unknown as EventHandlersProps);

      const mockArg = {
        event: {
          _def: {
            extendedProps: {
              uid: "recurring-base/20250315T100000",
              calId: "667037022b752d0026472254/cal1",
            },
          },
        },
        delta: { years: 0, months: 0, days: 1, milliseconds: 0 },
      };

      eventHandlers.handleEventDrop(mockArg);

      expect(mockSetSelectedEvent).toHaveBeenCalled();
      expect(mockSetOpenEditModePopup).toHaveBeenCalledWith("edit");
      expect(mockSetAfterChoiceFunc).toHaveBeenCalled();
    });

    it("directly updates non-recurring event on drag", () => {
      const mockDispatch = jest.fn();
      const nonRecurringState = {
        "667037022b752d0026472254/cal1": {
          ...basePreloadedState.calendars.list["667037022b752d0026472254/cal1"],
          events: {
            "single-event": {
              uid: "single-event",
              title: "Single Event",
              calId: "667037022b752d0026472254/cal1",
              start: day.toISOString(),
              end: new Date("2025-03-15T11:00:00Z").toISOString(),
              timezone: "UTC",
            },
          },
        },
      };

      const eventHandlers = createEventHandlers({
        setSelectedRange: jest.fn(),
        setOpenEventModal: jest.fn(),
        setTempEvent: jest.fn(),
        setOpenEventDisplay: jest.fn(),
        dispatch: mockDispatch,
        calendarRange: { start: new Date(), end: new Date() },
        setEventDisplayedId: jest.fn(),
        setEventDisplayedCalId: jest.fn(),
        setEventDisplayedTemp: jest.fn(),
        calendars: nonRecurringState,
        setSelectedEvent: jest.fn(),
        setAfterChoiceFunc: jest.fn(),
        setOpenEditModePopup: jest.fn(),
      } as unknown as EventHandlersProps);

      const mockArg = {
        event: {
          _def: {
            extendedProps: {
              uid: "single-event",
              calId: "667037022b752d0026472254/cal1",
            },
          },
        },
        delta: { years: 0, months: 0, days: 1, milliseconds: 0 },
      };

      eventHandlers.handleEventDrop(mockArg);

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining("updateEventLocal"),
        })
      );
    });
  });

  describe("Event Resize - Recurring Events", () => {
    it("shows EditModeDialog when resizing recurring event", () => {
      const mockDispatch = jest.fn();
      const mockSetSelectedEvent = jest.fn();
      const mockSetOpenEditModePopup = jest.fn();
      const mockSetAfterChoiceFunc = jest.fn();

      const eventHandlers = createEventHandlers({
        setSelectedRange: jest.fn(),
        setOpenEventModal: jest.fn(),
        setTempEvent: jest.fn(),
        setOpenEventDisplay: jest.fn(),
        dispatch: mockDispatch,
        calendarRange: { start: new Date(), end: new Date() },
        setEventDisplayedId: jest.fn(),
        setEventDisplayedCalId: jest.fn(),
        setEventDisplayedTemp: jest.fn(),
        calendars: basePreloadedState.calendars.list,
        setSelectedEvent: mockSetSelectedEvent,
        setAfterChoiceFunc: mockSetAfterChoiceFunc,
        setOpenEditModePopup: mockSetOpenEditModePopup,
      } as unknown as EventHandlersProps);

      const mockArg = {
        event: {
          _def: {
            extendedProps: {
              uid: "recurring-base/20250315T100000",
              calId: "667037022b752d0026472254/cal1",
            },
          },
        },
        startDelta: { years: 0, months: 0, days: 0, milliseconds: 0 },
        endDelta: { years: 0, months: 0, days: 0, milliseconds: 3600000 }, // 1 hour
      };

      eventHandlers.handleEventResize(mockArg);

      expect(mockSetSelectedEvent).toHaveBeenCalled();
      expect(mockSetOpenEditModePopup).toHaveBeenCalledWith("edit");
      expect(mockSetAfterChoiceFunc).toHaveBeenCalled();
    });
  });

  describe("RepeatEvent Component - Recurrence Editing", () => {
    it("disables repetition fields when isOwn is false", () => {
      renderWithProviders(
        <EventDisplayModal
          open={true}
          onClose={mockOnClose}
          calId={"otherCal/cal"}
          eventId={"recurring-base/20250315T100000"}
        />,
        {
          ...basePreloadedState,
          calendars: {
            ...basePreloadedState.calendars,
            list: {
              "otherCal/cal": {
                id: "otherCal/cal",
                name: "Other Calendar",
                color: "#00FF00",
                events: {
                  "recurring-base/20250315T100000": {
                    ...basePreloadedState.calendars.list[
                      "667037022b752d0026472254/cal1"
                    ].events["recurring-base/20250315T100000"],
                    calId: "otherCal/cal",
                    organizer: { cn: "other", cal_address: "other@test.com" },
                  },
                },
              },
            },
          },
        }
      );

      fireEvent.click(screen.getByRole("button", { name: /Show More/i }));

      // Repetition section should not be visible for non-owner
      expect(screen.queryByLabelText(/Repetition/i)).not.toBeInTheDocument();
    });
  });

  describe("handleRSVP function", () => {
    it("calls putEventAsync for non-recurring events", async () => {
      const mockDispatch = jest.fn();
      const mockOnClose = jest.fn();

      const {
        handleRSVP,
      } = require("../../../src/components/Event/eventHandlers/eventHandlers");

      jest.spyOn(eventThunks, "putEventAsync").mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });

      const nonRecurringEvent = {
        uid: "single-event",
        title: "Single Event",
        calId: "667037022b752d0026472254/cal1",
        start: day.toISOString(),
        end: new Date("2025-03-15T11:00:00Z").toISOString(),
        organizer: { cn: "test", cal_address: "test@test.com" },
        attendee: [
          {
            cn: "test",
            cal_address: "test@test.com",
            partstat: "NEEDS-ACTION",
          },
        ],
      };

      await handleRSVP(
        mockDispatch,
        basePreloadedState.calendars.list["667037022b752d0026472254/cal1"],
        basePreloadedState.user,
        nonRecurringEvent,
        "ACCEPTED",
        mockOnClose
      );

      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe("handleDelete function", () => {
    it("calls deleteEventAsync for non-recurring events", () => {
      const mockDispatch = jest.fn();
      const mockOnClose = jest.fn();

      const {
        handleDelete,
      } = require("../../../src/components/Event/eventHandlers/eventHandlers");

      jest
        .spyOn(eventThunks, "deleteEventAsync")
        .mockImplementation((payload) => {
          return () => Promise.resolve(payload) as any;
        });

      const nonRecurringEvent = {
        uid: "single-event",
        title: "Single Event",
        calId: "667037022b752d0026472254/cal1",
        URL: "/calendars/667037022b752d0026472254/cal1/single-event.ics",
      };

      handleDelete(
        false, // isRecurring
        undefined,
        mockOnClose,
        mockDispatch,
        basePreloadedState.calendars.list["667037022b752d0026472254/cal1"],
        nonRecurringEvent,
        "667037022b752d0026472254/cal1",
        "single-event"
      );

      expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
      expect(mockDispatch).toHaveBeenCalled();
    });

    it("calls deleteEventInstanceAsync when deleting solo recurring event", () => {
      const mockDispatch = jest.fn();
      const mockOnClose = jest.fn();

      const {
        handleDelete,
      } = require("../../../src/components/Event/eventHandlers/eventHandlers");

      jest
        .spyOn(eventThunks, "deleteEventInstanceAsync")
        .mockImplementation((payload) => {
          return () => Promise.resolve(payload) as any;
        });

      handleDelete(
        true, // isRecurring
        "solo",
        mockOnClose,
        mockDispatch,
        basePreloadedState.calendars.list["667037022b752d0026472254/cal1"],
        basePreloadedState.calendars.list["667037022b752d0026472254/cal1"]
          .events["recurring-base/20250315T100000"],
        "667037022b752d0026472254/cal1",
        "recurring-base/20250315T100000"
      );

      expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
      expect(mockDispatch).toHaveBeenCalled();
    });

    it("calls deleteEventAsync when deleting all recurring events", () => {
      const mockDispatch = jest.fn();
      const mockOnClose = jest.fn();

      const {
        handleDelete,
      } = require("../../../src/components/Event/eventHandlers/eventHandlers");

      jest
        .spyOn(eventThunks, "deleteEventAsync")
        .mockImplementation((payload) => {
          return () => Promise.resolve(payload) as any;
        });

      handleDelete(
        true, // isRecurring
        "all",
        mockOnClose,
        mockDispatch,
        basePreloadedState.calendars.list["667037022b752d0026472254/cal1"],
        basePreloadedState.calendars.list["667037022b752d0026472254/cal1"]
          .events["recurring-base/20250315T100000"],
        "667037022b752d0026472254/cal1",
        "recurring-base/20250315T100000"
      );

      expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe("Calendar Integration - EditModeDialog Flow", () => {
    it("passes correct eventId when editing all instances from preview", async () => {
      renderWithProviders(
        <EventPreviewModal
          open={true}
          onClose={mockOnClose}
          calId={"667037022b752d0026472254/cal1"}
          eventId={"recurring-base/20250315T100000"}
        />,
        basePreloadedState
      );

      // Click edit
      fireEvent.click(screen.getByTestId("EditIcon"));

      await waitFor(() => {
        expect(
          screen.getByText("Update the reccurent event")
        ).toBeInTheDocument();
      });

      // Select "All the events"
      fireEvent.click(screen.getByLabelText("All the events"));
      fireEvent.click(screen.getByRole("button", { name: /Ok/i }));

      await waitFor(() => {
        // Update modal should open
        expect(screen.getByText("Update Event")).toBeInTheDocument();
      });
    });
  });

  describe("Event URL handling for recurring events", () => {
    it("uses base ID for event URL when moving recurring event", async () => {
      const moveEventSpy = jest
        .spyOn(eventThunks, "moveEventAsync")
        .mockImplementation((payload) => {
          return () =>
            Promise.resolve({ calId: payload.cal.id, events: [] }) as any;
        });

      const twoCalState = {
        ...basePreloadedState,
        calendars: {
          ...basePreloadedState.calendars,
          list: {
            ...basePreloadedState.calendars.list,
            "667037022b752d0026472254/cal2": {
              id: "667037022b752d0026472254/cal2",
              name: "Calendar 2",
              color: "#00FF00",
              events: {},
            },
          },
        },
      };

      renderWithProviders(
        <EventDisplayModal
          open={true}
          onClose={mockOnClose}
          calId={"667037022b752d0026472254/cal1"}
          eventId={"recurring-base/20250315T100000"}
        />,
        twoCalState
      );

      // Change calendar
      fireEvent.mouseDown(screen.getByLabelText("Calendar"));
      const option = await screen.findByText("Calendar 2");
      fireEvent.click(option);

      fireEvent.click(screen.getByRole("button", { name: /Save/i }));

      await waitFor(() => {
        expect(moveEventSpy).toHaveBeenCalled();
      });

      const movePayload = moveEventSpy.mock.calls[0][0];
      // Should use base ID, not full uid with recurrence ID
      expect(movePayload.newURL).toContain("recurring-base.ics");
      expect(movePayload.newURL).not.toContain("/20250315T100000");
    });
  });
});
