import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import * as eventThunks from "../../../src/features/Calendars/CalendarSlice";
import { renderWithProviders } from "../../utils/Renderwithproviders";
import EventDisplayModal from "../../../src/features/Events/EventDisplay";
import EventPreviewModal from "../../../src/features/Events/EventDisplayPreview";
import { EditModeDialog } from "../../../src/components/Event/EditModeDialog";
import * as EventApi from "../../../src/features/Events/EventApi";

import preview from "jest-preview";

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
        },
      },
      pending: false,
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
      fireEvent.click(screen.getByText("Ok"));

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
      fireEvent.click(screen.getByText("Ok"));

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
      const getEventSpy = jest
        .spyOn(eventThunks, "getEventAsync")
        .mockImplementation((payload) => {
          return () =>
            Promise.resolve({
              calId: payload.calId,
              event:
                basePreloadedState.calendars.list[
                  "667037022b752d0026472254/cal1"
                ].events["recurring-base/20250315T100000"],
            }) as any;
        });

      renderWithProviders(
        <EventPreviewModal
          anchorPosition={{ top: 0, left: 0 }}
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
          anchorPosition={{ top: 0, left: 0 }}
          open={true}
          onClose={mockOnClose}
          calId={"667037022b752d0026472254/cal1"}
          eventId={"recurring-base/20250315T100000"}
        />,
        basePreloadedState
      );

      fireEvent.click(screen.getByTestId("DeleteIcon"));

      await waitFor(() => {
        expect(
          screen.getByText("Update the reccurent event")
        ).toBeInTheDocument();
      });
    });

    it("shows EditModeDialog when RSVP to a recurring event", async () => {
      renderWithProviders(
        <EventPreviewModal
          anchorPosition={{ top: 0, left: 0 }}
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
          anchorPosition={{ top: 0, left: 0 }}
          open={true}
          onClose={mockOnClose}
          calId={"667037022b752d0026472254/cal1"}
          eventId={"recurring-base/20250315T100000"}
        />,
        basePreloadedState
      );

      fireEvent.click(screen.getByTestId("DeleteIcon"));

      await waitFor(() => {
        expect(
          screen.getByText("Update the reccurent event")
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText("This event"));
      fireEvent.click(screen.getByText("Ok"));

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
          anchorPosition={{ top: 0, left: 0 }}
          open={true}
          onClose={mockOnClose}
          calId={"667037022b752d0026472254/cal1"}
          eventId={"recurring-base/20250315T100000"}
        />,
        basePreloadedState
      );

      fireEvent.click(screen.getByTestId("DeleteIcon"));

      await waitFor(() => {
        expect(
          screen.getByText("Update the reccurent event")
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText("All the events"));
      fireEvent.click(screen.getByText("Ok"));

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
          anchorPosition={{ top: 0, left: 0 }}
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
      fireEvent.click(screen.getByText("Ok"));

      await waitFor(() => {
        expect(spy).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });

      const updatedEvent = spy.mock.calls[0][0].event;
      expect(updatedEvent.attendee[0].partstat).toBe("ACCEPTED");
    });

    it("calls updateSeriesAsync when accepting all instances", async () => {
      const getEventSpy = jest.spyOn(EventApi, "getEvent").mockResolvedValue({
        ...basePreloadedState.calendars.list["667037022b752d0026472254/cal1"]
          .events["recurring-base/20250315T100000"],
        uid: "recurring-base",
      } as any);

      const spy = jest
        .spyOn(eventThunks, "updateSeriesAsync")
        .mockImplementation((payload) => {
          return () =>
            Promise.resolve({ calId: payload.cal.id, events: [] }) as any;
        });

      renderWithProviders(
        <EventPreviewModal
          anchorPosition={{ top: 0, left: 0 }}
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
      fireEvent.click(screen.getByText("Ok"));

      await waitFor(() => {
        expect(getEventSpy).toHaveBeenCalled();
        expect(spy).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });

      const updatedEvent = spy.mock.calls[0][0].event;
      expect(updatedEvent.attendee[0].partstat).toBe("ACCEPTED");
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

      fireEvent.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(spy).toHaveBeenCalled();
      });

      const updatedEvent = spy.mock.calls[0][0].event;
      expect(updatedEvent.title).toBe("Updated Single Instance");
      expect(updatedEvent.recurrenceId).toBe("20250315T100000");
    });

    it("calls updateSeriesAsync when saving all instances with typeOfAction='all'", async () => {
      const spy = jest
        .spyOn(eventThunks, "updateSeriesAsync")
        .mockImplementation((payload) => {
          return () =>
            Promise.resolve({ calId: payload.cal.id, events: [] }) as any;
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

      const titleField = screen.getByLabelText("Title");
      fireEvent.change(titleField, {
        target: { value: "Updated All Instances" },
      });

      fireEvent.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(spy).toHaveBeenCalled();
      });

      const updatedEvent = spy.mock.calls[0][0].event;
      expect(updatedEvent.title).toBe("Updated All Instances");
    });
  });
});
