import { jest } from "@jest/globals";
import { ThunkDispatch } from "@reduxjs/toolkit";
import "@testing-library/jest-dom";
import { screen, waitFor, fireEvent, act } from "@testing-library/react";
import * as appHooks from "../../../src/app/hooks";
import * as eventUtils from "../../../src/components/Event/utils/eventUtils";
import * as userApi from "../../../src/features/User/userAPI";
import * as calendarUtils from "../../../src/components/Calendar/utils/calendarUtils";
import * as eventThunks from "../../../src/features/Calendars/CalendarSlice";
import EventPreviewModal from "../../../src/features/Events/EventDisplayPreview";
import EventPopover from "../../../src/features/Events/EventModal";
import EventUpdateModal from "../../../src/features/Events/EventUpdateModal";
import CalendarLayout from "../../../src/components/Calendar/CalendarLayout";
import { renderWithProviders } from "../../utils/Renderwithproviders";
import { SpiedFunction } from "jest-mock";
import { Calendar } from "../../../src/features/Calendars/CalendarTypes";
import { CalendarEvent } from "../../../src/features/Events/EventsTypes";
import { DateSelectArg } from "@fullcalendar/core";

describe("Update tempcalendars called with correct params", () => {
  const today = new Date();
  const start = new Date(today);
  start.setHours(10, 0, 0, 0);
  const end = new Date(today);
  end.setHours(11, 0, 0, 0);

  let refreshCalendarsSpy: SpiedFunction<
    (
      dispatch: ThunkDispatch<any, any, any>,
      calendars: Calendar[],
      calType?: "temp"
    ) => Promise<void>
  >;
  let refreshSingularCalendarSpy: SpiedFunction<
    (
      dispatch: ThunkDispatch<any, any, any>,
      calendar: Calendar,
      calendarRange: { start: Date; end: Date },
      calType?: "temp"
    ) => Promise<void>
  >;
  let updateTempCalendarSpy: SpiedFunction<
    (
      tempcalendars: Record<string, Calendar>,
      event: CalendarEvent,
      dispatch: ThunkDispatch<any, any, any>,
      calendarRange: { start: Date; end: Date }
    ) => Promise<void>
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    const dispatch = jest.fn((thunk) => {
      if (typeof thunk === "function") {
        return thunk(dispatch, () => ({}), undefined);
      }
      return thunk;
    }) as ThunkDispatch<any, any, any>;
    jest.spyOn(appHooks, "useAppDispatch").mockReturnValue(dispatch);
    refreshCalendarsSpy = jest
      .spyOn(eventUtils, "refreshCalendars")
      .mockResolvedValue();
    updateTempCalendarSpy = jest.spyOn(calendarUtils, "updateTempCalendar");
    refreshSingularCalendarSpy = jest.spyOn(
      eventUtils,
      "refreshSingularCalendar"
    );
  });

  afterEach(() => {
    refreshCalendarsSpy.mockRestore();
    updateTempCalendarSpy.mockRestore();
    refreshSingularCalendarSpy.mockRestore();
  });

  const createPreloadedState = (withTempList = true) => ({
    user: {
      userData: {
        sub: "test",
        email: "owner@test.com",
        sid: "mockSid",
        openpaasId: "667037022b752d0026472254",
      },
      organiserData: {
        cn: "Owner",
        cal_address: "owner@test.com",
      },
      tokens: {
        accessToken: "token",
      },
    },
    calendars: {
      list: {
        "667037022b752d0026472254/cal1": {
          name: "Calendar 1",
          id: "667037022b752d0026472254/cal1",
          color: "#FF0000",
          ownerEmails: ["owner@test.com"],
          events: {
            event1: {
              id: "event1",
              calId: "667037022b752d0026472254/cal1",
              uid: "event1",
              title: "Test Event",
              start: start.toISOString(),
              end: end.toISOString(),
              attendee: [{ cal_address: "attendee@test.com" }],
              organizer: {
                cn: "Owner",
                cal_address: "owner@test.com",
              },
            },
          },
        },
      },
      templist: withTempList
        ? {
            temp1: {
              id: "temp1",
              name: "Temp Calendar",
              color: "#00FF00",
              events: {},
              ownerEmails: ["attendee@test.com"],
            },
          }
        : undefined,
      pending: false,
    },
  });

  it("should call updateTempCalendar with correct params after event deletion", async () => {
    const preloadedState = createPreloadedState(true);

    const mockOnClose = jest.fn();
    renderWithProviders(
      <EventPreviewModal
        eventId="event1"
        calId="667037022b752d0026472254/cal1"
        open={true}
        onClose={mockOnClose}
      />,
      preloadedState
    );

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("MoreVertIcon"));
      expect(screen.getByText("eventPreview.deleteEvent")).toBeInTheDocument();
    });

    const deleteMenuItem = screen.getByText("eventPreview.deleteEvent");
    fireEvent.click(deleteMenuItem);

    await waitFor(() =>
      expect(updateTempCalendarSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          temp1: expect.objectContaining({ id: "temp1" }),
        }),
        expect.objectContaining({
          attendee: [
            expect.objectContaining({ cal_address: "attendee@test.com" }),
          ],
        }),
        expect.any(Function),
        expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date),
        })
      )
    );

    await waitFor(() =>
      expect(refreshSingularCalendarSpy).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ id: "temp1" }),
        expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date),
        }),
        "temp"
      )
    );
  });

  it("should NOT call updateTempCalendar when templist is undefined", async () => {
    const preloadedState = createPreloadedState(false);

    const mockOnClose = jest.fn();
    renderWithProviders(
      <EventPreviewModal
        eventId="event1"
        calId="667037022b752d0026472254/cal1"
        open={true}
        onClose={mockOnClose}
      />,
      preloadedState
    );

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("MoreVertIcon"));
      expect(screen.getByText("eventPreview.deleteEvent")).toBeInTheDocument();
    });

    const deleteMenuItem = screen.getByText("eventPreview.deleteEvent");
    fireEvent.click(deleteMenuItem);

    await waitFor(() => {
      expect(updateTempCalendarSpy).not.toHaveBeenCalled();
      expect(refreshSingularCalendarSpy).not.toHaveBeenCalled();
    });
  });

  it("should call updateTempCalendar with correct params after event creation", async () => {
    const preloadedState = createPreloadedState(true);
    const defaultSelectedRange = {
      startStr: "2025-07-18T09:00Z",
      endStr: "2025-07-18T10:00Z",
      start: new Date("2025-07-18T09:00Z"),
      end: new Date("2025-07-18T10:00Z"),
      allDay: false,
      resource: undefined,
    } as unknown as DateSelectArg;
    jest.spyOn(userApi, "searchUsers");

    // Mock putEventAsync to return success with unwrap
    const putEventAsyncMock = jest
      .spyOn(eventThunks, "putEventAsync")
      .mockImplementation((payload) => {
        const action = {
          type: "calendars/putEvent/fulfilled",
          payload: {
            calId: payload.cal.id,
            events: [],
            calType: payload.calType,
          },
          unwrap: () =>
            Promise.resolve({
              calId: payload.cal.id,
              events: [],
              calType: payload.calType,
            }),
        };
        const promise = Promise.resolve(action) as any;
        return () => promise;
      });

    renderWithProviders(
      <EventPopover
        anchorEl={null}
        open={true}
        onClose={jest.fn()}
        selectedRange={defaultSelectedRange}
        setSelectedRange={jest.fn()}
        calendarRef={{ current: null }}
      />,
      preloadedState
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: "New Event" } });

    const attendeeInput = screen.getByLabelText(/peopleSearch.label/i);
    fireEvent.change(attendeeInput, { target: { value: "attendee@test.com" } });
    fireEvent.keyDown(attendeeInput, { key: "Enter", code: "Enter" });

    const saveButton = screen.getByText(/save/i);
    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(
      () =>
        expect(updateTempCalendarSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            temp1: expect.objectContaining({ id: "temp1" }),
          }),
          expect.objectContaining({
            title: "New Event",
          }),
          expect.any(Function),
          expect.objectContaining({
            start: expect.any(Date),
            end: expect.any(Date),
          })
        ),
      { timeout: 3000 }
    );

    await waitFor(() =>
      expect(refreshSingularCalendarSpy).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ id: "temp1" }),
        expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date),
        }),
        "temp"
      )
    );
  });

  it("should call updateTempCalendar with correct params after event update", async () => {
    const preloadedState = createPreloadedState(true);

    const mockOnClose = jest.fn();
    renderWithProviders(
      <EventUpdateModal
        open={true}
        onClose={mockOnClose}
        eventId="event1"
        calId="667037022b752d0026472254/cal1"
      />,
      preloadedState
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const saveButton = screen.getByText(/save/i);
    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(updateTempCalendarSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          temp1: expect.objectContaining({ id: "temp1" }),
        }),
        expect.objectContaining({
          attendee: [
            expect.objectContaining({ cal_address: "attendee@test.com" }),
          ],
        }),
        expect.any(Function),
        expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date),
        })
      )
    );

    await waitFor(() =>
      expect(refreshSingularCalendarSpy).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ id: "temp1" }),
        expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date),
        }),
        "temp"
      )
    );
  });

  it("should call updateTempCalendar with correct params after recurring event instance update", async () => {
    const preloadedStateWithRecurring = {
      ...createPreloadedState(true),
      calendars: {
        ...createPreloadedState(true).calendars,
        list: {
          "667037022b752d0026472254/cal1": {
            name: "Calendar 1",
            id: "667037022b752d0026472254/cal1",
            color: "#FF0000",
            ownerEmails: ["owner@test.com"],
            events: {
              event1: {
                id: "event1",
                calId: "667037022b752d0026472254/cal1",
                uid: "event1",
                title: "Recurring Event",
                start: start.toISOString(),
                end: end.toISOString(),
                attendee: [{ cal_address: "attendee@test.com" }],
                rrule: {
                  freq: "WEEKLY",
                },
                organizer: {
                  cn: "Owner",
                  cal_address: "owner@test.com",
                },
              },
            },
          },
        },
      },
    };

    const mockOnClose = jest.fn();
    renderWithProviders(
      <EventUpdateModal
        open={true}
        onClose={mockOnClose}
        eventId="event1"
        calId="667037022b752d0026472254/cal1"
        typeOfAction="solo"
      />,
      preloadedStateWithRecurring
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const saveButton = screen.getByText(/save/i);
    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(updateTempCalendarSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          temp1: expect.objectContaining({ id: "temp1" }),
        }),
        expect.objectContaining({
          attendee: [
            expect.objectContaining({ cal_address: "attendee@test.com" }),
          ],
        }),
        expect.any(Function),
        expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date),
        })
      )
    );

    await waitFor(() =>
      expect(refreshSingularCalendarSpy).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ id: "temp1" }),
        expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date),
        }),
        "temp"
      )
    );
  });

  it("should call updateTempCalendar with correct params after recurring series update", async () => {
    const preloadedStateWithRecurring = {
      ...createPreloadedState(true),
      calendars: {
        ...createPreloadedState(true).calendars,
        list: {
          "667037022b752d0026472254/cal1": {
            name: "Calendar 1",
            id: "667037022b752d0026472254/cal1",
            color: "#FF0000",
            ownerEmails: ["owner@test.com"],
            events: {
              event1: {
                id: "event1",
                calId: "667037022b752d0026472254/cal1",
                uid: "event1",
                title: "Recurring Event",
                start: start.toISOString(),
                end: end.toISOString(),
                attendee: [{ cal_address: "attendee@test.com" }],
                rrule: {
                  freq: "DAILY",
                },
                organizer: {
                  cn: "Owner",
                  cal_address: "owner@test.com",
                },
              },
            },
          },
        },
      },
    };

    const mockOnClose = jest.fn();
    renderWithProviders(
      <EventUpdateModal
        open={true}
        onClose={mockOnClose}
        eventId="event1"
        calId="667037022b752d0026472254/cal1"
        typeOfAction="all"
      />,
      preloadedStateWithRecurring
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const saveButton = screen.getByText(/save/i);
    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(updateTempCalendarSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          temp1: expect.objectContaining({ id: "temp1" }),
        }),
        expect.objectContaining({
          attendee: [
            expect.objectContaining({ cal_address: "attendee@test.com" }),
          ],
        }),
        expect.any(Function),
        expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date),
        })
      )
    );

    await waitFor(() =>
      expect(refreshSingularCalendarSpy).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ id: "temp1" }),
        expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date),
        }),
        "temp"
      )
    );
  });

  it("should call refreshCalendars with 'temp' param in CalendarLayout handleRefresh", async () => {
    const preloadedState = createPreloadedState(true);

    renderWithProviders(<CalendarLayout />, preloadedState);

    fireEvent.click(screen.getByTestId("RefreshIcon"));

    await waitFor(() => {
      // Should call refreshCalendars for regular calendars
      expect(refreshCalendarsSpy).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Array)
      );

      // Should also call refreshCalendars with 'temp' for templist
      expect(refreshCalendarsSpy).toHaveBeenCalledWith(
        expect.any(Function),
        expect.arrayContaining([expect.objectContaining({ id: "temp1" })]),
        "temp"
      );
    });
  });

  it("should only refresh temp calendars where attendees match ownerEmails", async () => {
    const preloadedStateMultipleTempCals = {
      ...createPreloadedState(true),
      calendars: {
        ...createPreloadedState(true).calendars,
        templist: {
          temp1: {
            id: "temp1",
            name: "Temp Calendar 1",
            color: "#00FF00",
            events: {},
            ownerEmails: ["attendee@test.com"], // matches event attendee
          },
          temp2: {
            id: "temp2",
            name: "Temp Calendar 2",
            color: "#0000FF",
            events: {},
            ownerEmails: ["other@test.com"], // does NOT match event attendee
          },
        },
      },
    };

    const mockOnClose = jest.fn();
    renderWithProviders(
      <EventPreviewModal
        eventId="event1"
        calId="667037022b752d0026472254/cal1"
        open={true}
        onClose={mockOnClose}
      />,
      preloadedStateMultipleTempCals
    );

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("MoreVertIcon"));
      expect(screen.getByText("eventPreview.deleteEvent")).toBeInTheDocument();
    });

    const deleteMenuItem = screen.getByText("eventPreview.deleteEvent");
    fireEvent.click(deleteMenuItem);

    await waitFor(() => {
      // Should only refresh temp1, not temp2
      const temp1Calls = refreshSingularCalendarSpy.mock.calls.filter(
        (call) => call[1]?.id === "temp1"
      );
      const temp2Calls = refreshSingularCalendarSpy.mock.calls.filter(
        (call) => call[1]?.id === "temp2"
      );

      expect(temp1Calls.length).toBeGreaterThan(0);
      expect(temp2Calls.length).toBe(0);
    });
  });

  it("should call emptyEventsCal with correct params before refreshing", async () => {
    const emptyEventsCalSpy = jest.spyOn(eventThunks, "emptyEventsCal");

    const preloadedState = createPreloadedState(true);

    const mockOnClose = jest.fn();
    renderWithProviders(
      <EventPreviewModal
        eventId="event1"
        calId="667037022b752d0026472254/cal1"
        open={true}
        onClose={mockOnClose}
      />,
      preloadedState
    );

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("MoreVertIcon"));
      expect(screen.getByText("eventPreview.deleteEvent")).toBeInTheDocument();
    });

    const deleteMenuItem = screen.getByText("eventPreview.deleteEvent");
    fireEvent.click(deleteMenuItem);

    await waitFor(() => {
      // emptyEventsCal should be called with calType: "temp" for singular calendar refresh
      expect(emptyEventsCalSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          calId: "temp1",
          calType: "temp",
        })
      );
    });

    emptyEventsCalSpy.mockRestore();
  });

  it("should handle temp calendar with multiple ownerEmails where one matches", async () => {
    const preloadedStateMultipleOwners = {
      ...createPreloadedState(true),
      calendars: {
        ...createPreloadedState(true).calendars,
        list: {
          "667037022b752d0026472254/cal1": {
            name: "Calendar 1",
            id: "667037022b752d0026472254/cal1",
            color: "#FF0000",
            ownerEmails: ["owner@test.com"],
            events: {
              event1: {
                id: "event1",
                calId: "667037022b752d0026472254/cal1",
                uid: "event1",
                title: "Test Event",
                start: start.toISOString(),
                end: end.toISOString(),
                attendee: [{ cal_address: "attendee@test.com" }],
                organizer: {
                  cn: "Owner",
                  cal_address: "owner@test.com",
                },
              },
            },
          },
        },
        templist: {
          temp1: {
            id: "temp1",
            name: "Shared Calendar",
            color: "#00FF00",
            events: {},
            ownerEmails: [
              "someoneelse@test.com",
              "attendee@test.com", // matches
              "anotherperson@test.com",
            ],
          },
        },
      },
    };

    const mockOnClose = jest.fn();
    renderWithProviders(
      <EventPreviewModal
        eventId="event1"
        calId="667037022b752d0026472254/cal1"
        open={true}
        onClose={mockOnClose}
      />,
      preloadedStateMultipleOwners
    );

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("MoreVertIcon"));
      expect(screen.getByText("eventPreview.deleteEvent")).toBeInTheDocument();
    });

    const deleteMenuItem = screen.getByText("eventPreview.deleteEvent");
    fireEvent.click(deleteMenuItem);

    await waitFor(() => {
      // Should still refresh temp1 because one ownerEmail matches
      const temp1Calls = refreshSingularCalendarSpy.mock.calls.filter(
        (call) => call[1]?.id === "temp1"
      );

      expect(temp1Calls.length).toBeGreaterThan(0);
      expect(temp1Calls[0][3]).toBe("temp");
    });
  });
  it("should update multiple temp calendars when event has multiple attendees matching different ownerEmails", async () => {
    const preloadedStateMultipleAttendees = {
      ...createPreloadedState(true),
      calendars: {
        ...createPreloadedState(true).calendars,
        list: {
          "667037022b752d0026472254/cal1": {
            name: "Calendar 1",
            id: "667037022b752d0026472254/cal1",
            color: "#FF0000",
            ownerEmails: ["owner@test.com"],
            events: {
              event1: {
                id: "event1",
                calId: "667037022b752d0026472254/cal1",
                uid: "event1",
                title: "Test Event",
                start: start.toISOString(),
                end: end.toISOString(),
                attendee: [
                  { cal_address: "attendee1@test.com" },
                  { cal_address: "attendee2@test.com" },
                  { cal_address: "attendee3@test.com" },
                ],
                organizer: {
                  cn: "Owner",
                  cal_address: "owner@test.com",
                },
              },
            },
          },
        },
        templist: {
          temp1: {
            id: "temp1",
            name: "Temp Calendar 1",
            color: "#00FF00",
            events: {},
            ownerEmails: ["attendee1@test.com"],
          },
          temp2: {
            id: "temp2",
            name: "Temp Calendar 2",
            color: "#0000FF",
            events: {},
            ownerEmails: ["attendee2@test.com"],
          },
          temp3: {
            id: "temp3",
            name: "Temp Calendar 3",
            color: "#FF00FF",
            events: {},
            ownerEmails: ["attendee3@test.com"],
          },
          temp4: {
            id: "temp4",
            name: "Temp Calendar 4",
            color: "#FFFF00",
            events: {},
            ownerEmails: ["nonmatching@test.com"], // should NOT be refreshed
          },
        },
      },
    };

    const mockOnClose = jest.fn();
    renderWithProviders(
      <EventPreviewModal
        eventId="event1"
        calId="667037022b752d0026472254/cal1"
        open={true}
        onClose={mockOnClose}
      />,
      preloadedStateMultipleAttendees
    );

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("MoreVertIcon"));
      expect(screen.getByText("eventPreview.deleteEvent")).toBeInTheDocument();
    });

    const deleteMenuItem = screen.getByText("eventPreview.deleteEvent");
    fireEvent.click(deleteMenuItem);

    await waitFor(() => {
      // Should be called once with all templist
      expect(updateTempCalendarSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          temp1: expect.objectContaining({ id: "temp1" }),
          temp2: expect.objectContaining({ id: "temp2" }),
          temp3: expect.objectContaining({ id: "temp3" }),
          temp4: expect.objectContaining({ id: "temp4" }),
        }),
        expect.objectContaining({
          attendee: expect.arrayContaining([
            expect.objectContaining({ cal_address: "attendee1@test.com" }),
            expect.objectContaining({ cal_address: "attendee2@test.com" }),
            expect.objectContaining({ cal_address: "attendee3@test.com" }),
          ]),
        }),
        expect.any(Function),
        expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date),
        })
      );
    });

    await waitFor(() => {
      // Should refresh temp1, temp2, and temp3 (matching attendees)
      const temp1Calls = refreshSingularCalendarSpy.mock.calls.filter(
        (call) => call[1]?.id === "temp1"
      );
      const temp2Calls = refreshSingularCalendarSpy.mock.calls.filter(
        (call) => call[1]?.id === "temp2"
      );
      const temp3Calls = refreshSingularCalendarSpy.mock.calls.filter(
        (call) => call[1]?.id === "temp3"
      );
      const temp4Calls = refreshSingularCalendarSpy.mock.calls.filter(
        (call) => call[1]?.id === "temp4"
      );

      expect(temp1Calls.length).toBeGreaterThan(0);
      expect(temp2Calls.length).toBeGreaterThan(0);
      expect(temp3Calls.length).toBeGreaterThan(0);
      expect(temp4Calls.length).toBe(0); // Should NOT be refreshed

      // Verify all matching calendars were refreshed with 'temp' param
      expect(temp1Calls[0][3]).toBe("temp");
      expect(temp2Calls[0][3]).toBe("temp");
      expect(temp3Calls[0][3]).toBe("temp");
    });
  });
});
