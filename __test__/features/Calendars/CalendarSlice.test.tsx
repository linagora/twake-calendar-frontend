import * as calAPI from "@/features/Calendars/CalendarApi";
import reducer, {
  addEvent,
  createCalendar,
  removeEvent,
  removeTempCal,
  updateEventLocal,
} from "@/features/Calendars/CalendarSlice";
import { Calendar } from "@/features/Calendars/CalendarTypes";
import {
  addSharedCalendarAsync,
  createCalendarAsync,
  deleteEventAsync,
  getCalendarDetailAsync,
  getCalendarsListAsync,
  getEventAsync,
  getTempCalendarsListAsync,
  moveEventAsync,
  patchACLCalendarAsync,
  patchCalendarAsync,
  putEventAsync,
  removeCalendarAsync,
} from "@/features/Calendars/services";
import { CalendarEvent } from "@/features/Events/EventsTypes";
import * as userAPI from "@/features/User/userAPI";
import userReducer, { setUserData } from "@/features/User/userSlice";
import { configureStore } from "@reduxjs/toolkit";

jest.mock("@/features/Calendars/CalendarApi");
jest.mock("@/features/User/userAPI");
jest.mock("@/features/Events/EventApi");
jest.mock("@/features/Events/eventUtils");
jest.mock("@/utils/apiUtils");

describe("CalendarSlice", () => {
  const initialState = {
    list: {},
    templist: {},
    pending: false,
    error: null,
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("reducers", () => {
    it("createCalendar adds new calendar", () => {
      const action = createCalendar({
        name: "Test Cal",
        color: "#ff0000",
        description: "desc",
      });
      const state = reducer(initialState, action);
      const values = Object.values(state.list);
      expect(values[0].name).toBe("Test Cal");
      expect(values[0].color).toBe("#ff0000");
    });

    it("addEvent adds event to calendar", () => {
      const calId = "user/cal";
      const event = { uid: "event1", title: "My Event" } as any;
      const stateWithCal = {
        ...initialState,
        list: { [calId]: { id: calId, events: {} } as any },
      };
      const state = reducer(
        stateWithCal,
        addEvent({ calendarUid: calId, event })
      );
      expect(state.list[calId].events["event1"]).toEqual(
        expect.objectContaining({ uid: "event1" })
      );
    });

    it("removeEvent deletes event", () => {
      const calId = "user/cal";
      const stateWithEvent = {
        ...initialState,
        list: {
          [calId]: {
            id: calId,
            events: { e1: { uid: "e1" } },
          } as unknown as Calendar,
        },
      };
      const state = reducer(
        stateWithEvent,
        removeEvent({ calendarUid: calId, eventUid: "e1" })
      );
      expect(state.list[calId].events).toEqual({});
    });

    it("updateEventLocal updates an event", () => {
      const calId = "user/cal";
      const stateWithEvent = {
        ...initialState,
        list: {
          [calId]: {
            id: calId,
            events: { e1: { uid: "e1", title: "Old" } },
          } as unknown as Calendar,
        },
      };
      const state = reducer(
        stateWithEvent,
        updateEventLocal({ calId, event: { uid: "e1", title: "New" } as any })
      );
      expect(state.list[calId].events.e1.title).toBe("New");
    });

    it("removeTempCal deletes temp calendar", () => {
      const stateWithTemp = {
        ...initialState,
        templist: { temp1: { id: "temp1" } as any },
      };
      const state = reducer(stateWithTemp, removeTempCal("temp1"));
      expect(state.templist).toEqual({});
    });
  });

  describe("extraReducers (thunks)", () => {
    const storeFactory = () =>
      configureStore({
        reducer: { calendars: reducer, user: userReducer },
      });
    beforeEach(() => {
      jest.resetAllMocks();
    });
    it("getCalendarsListAsync.fulfilled replaces list", async () => {
      (userAPI.getOpenPaasUser as jest.Mock).mockResolvedValue({ id: "u1" });
      (calAPI.getCalendars as jest.Mock).mockResolvedValue({
        _embedded: { "dav:calendar": [] },
      });
      (userAPI.getUserDetails as jest.Mock).mockResolvedValue({
        firstname: "Alice",
        lastname: "Smith",
        emails: ["a@b.com"],
      });

      const store = storeFactory();
      await store.dispatch(getCalendarsListAsync() as any);
      const state = store.getState().calendars;
      expect(state.list).toEqual({});
    });

    it("getCalendarsListAsync loads user details in parallel for multiple owners", async () => {
      const mockCalendars = [
        {
          _links: { self: { href: "/calendars/u1/cal1.json" } },
          "dav:name": "Calendar 1",
          "apple:color": "#FF0000",
          acl: [],
        },
        {
          _links: { self: { href: "/calendars/u2/cal2.json" } },
          "dav:name": "Calendar 2",
          "apple:color": "#00FF00",
          acl: [],
        },
        {
          _links: { self: { href: "/calendars/u3/cal3.json" } },
          "dav:name": "Calendar 3",
          "apple:color": "#0000FF",
          acl: [],
        },
      ];

      (userAPI.getOpenPaasUser as jest.Mock).mockResolvedValue({ id: "u1" });
      (calAPI.getCalendars as jest.Mock).mockResolvedValue({
        _embedded: { "dav:calendar": mockCalendars },
      });

      const getUserDetailsMock = userAPI.getUserDetails as jest.Mock;
      getUserDetailsMock
        .mockResolvedValueOnce({
          firstname: "Alice",
          lastname: "Smith",
          emails: ["alice@example.com"],
        })
        .mockResolvedValueOnce({
          firstname: "Bob",
          lastname: "Jones",
          emails: ["bob@example.com"],
        })
        .mockResolvedValueOnce({
          firstname: "Charlie",
          lastname: "Brown",
          emails: ["charlie@example.com"],
        });

      const store = storeFactory();
      await store.dispatch(getCalendarsListAsync() as any);

      expect(getUserDetailsMock).toHaveBeenCalledTimes(3);
      expect(getUserDetailsMock).toHaveBeenCalledWith("u1");
      expect(getUserDetailsMock).toHaveBeenCalledWith("u2");
      expect(getUserDetailsMock).toHaveBeenCalledWith("u3");

      const state = store.getState().calendars;
      expect(state.list["u1/cal1"].owner).toContain("Alice");
      expect(state.list["u2/cal2"].owner).toContain("Bob");
      expect(state.list["u3/cal3"].owner).toContain("Charlie");
    });

    it("getCalendarsListAsync deduplicates getUserDetails calls for same ownerId", async () => {
      const mockCalendars = [
        {
          _links: { self: { href: "/calendars/u1/cal1.json" } },
          "dav:name": "Calendar 1",
          "apple:color": "#FF0000",
          acl: [],
        },
        {
          _links: { self: { href: "/calendars/u1/cal2.json" } },
          "dav:name": "Calendar 2",
          "apple:color": "#00FF00",
          acl: [],
        },
        {
          _links: { self: { href: "/calendars/u1/cal3.json" } },
          "dav:name": "Calendar 3",
          "apple:color": "#0000FF",
          acl: [],
        },
      ];

      (userAPI.getOpenPaasUser as jest.Mock).mockResolvedValue({ id: "u1" });
      (calAPI.getCalendars as jest.Mock).mockResolvedValue({
        _embedded: { "dav:calendar": mockCalendars },
      });

      const getUserDetailsMock = userAPI.getUserDetails as jest.Mock;
      getUserDetailsMock.mockResolvedValue({
        firstname: "Alice",
        lastname: "Smith",
        emails: ["alice@example.com"],
      });

      const store = storeFactory();
      await store.dispatch(getCalendarsListAsync() as any);

      expect(getUserDetailsMock).toHaveBeenCalledTimes(1);
      expect(getUserDetailsMock).toHaveBeenCalledWith("u1");
    });

    it("getCalendarsListAsync processes owners in batches of 20", async () => {
      const mockCalendars = Array.from({ length: 45 }, (_, i) => ({
        _links: { self: { href: `/calendars/u${i + 1}/cal${i + 1}.json` } },
        "dav:name": `Calendar ${i + 1}`,
        "apple:color": "#FF0000",
        acl: [],
      }));

      (userAPI.getOpenPaasUser as jest.Mock).mockResolvedValue({ id: "u1" });
      (calAPI.getCalendars as jest.Mock).mockResolvedValue({
        _embedded: { "dav:calendar": mockCalendars },
      });

      const getUserDetailsMock = userAPI.getUserDetails as jest.Mock;
      getUserDetailsMock.mockImplementation((ownerId: string) =>
        Promise.resolve({
          firstname: "User",
          lastname: ownerId,
          emails: [`${ownerId}@example.com`],
        })
      );

      const store = storeFactory();
      await store.dispatch(getCalendarsListAsync() as any);

      expect(getUserDetailsMock).toHaveBeenCalledTimes(45);
      const state = store.getState().calendars;
      expect(Object.keys(state.list)).toHaveLength(45);
    });

    it("getCalendarsListAsync doesnt call getUserDetails if userdata exist in store", async () => {
      const existingCalendars = {
        "u1/cal1": {
          id: "u1/cal1",
          name: "Existing Calendar",
          events: {},
        } as Calendar,
      };

      const store = storeFactory();
      store.dispatch({
        type: "calendars/getCalendars/fulfilled",
        payload: { importedCalendars: existingCalendars, errors: "" },
      });
      store.dispatch(setUserData({ openpaasId: "bla" }));
      const getUserDetailsMock = userAPI.getUserDetails as jest.Mock;

      await store.dispatch(getCalendarsListAsync() as any);

      expect(getUserDetailsMock).not.toHaveBeenCalled();

      const state = store.getState().calendars;
      expect(state.list).toEqual(existingCalendars);
    });

    it("getCalendarsListAsync handles errors in getUserDetails gracefully", async () => {
      const mockCalendars = [
        {
          _links: { self: { href: "/calendars/u1/cal1.json" } },
          "dav:name": "Calendar 1",
          "apple:color": "#FF0000",
          acl: [],
        },
        {
          _links: { self: { href: "/calendars/u2/cal2.json" } },
          "dav:name": "Calendar 2",
          "apple:color": "#00FF00",
          acl: [],
        },
      ];

      (userAPI.getOpenPaasUser as jest.Mock).mockResolvedValue({ id: "u1" });
      (calAPI.getCalendars as jest.Mock).mockResolvedValue({
        _embedded: { "dav:calendar": mockCalendars },
      });

      const getUserDetailsMock = userAPI.getUserDetails as jest.Mock;
      getUserDetailsMock
        .mockResolvedValueOnce({
          firstname: "Alice",
          lastname: "Smith",
          emails: ["alice@example.com"],
        })
        .mockRejectedValueOnce(new Error("Failed to fetch user"));

      const store = storeFactory();
      const result = await store.dispatch(getCalendarsListAsync() as any);

      expect(getUserDetailsMock).toHaveBeenCalledTimes(2);
      const state = store.getState().calendars;
      expect(state.list["u1/cal1"].owner).toContain("Alice");
      expect(state.list["u2/cal2"].owner).toContain("Unknown User");
      expect(result.payload.errors).toBeTruthy();
    });

    it("patchCalendarAsync.fulfilled updates calendar fields", () => {
      const calId = "c1";
      const prev = {
        ...initialState,
        list: { c1: { id: calId, events: { e1: { uid: "e1" } } } as any },
      };
      const patch = { name: "N", desc: "D", color: { "apple:color": "#00f" } };
      const state = reducer(
        prev,
        patchCalendarAsync.fulfilled(
          { calId, calLink: "link", patch },
          "req1",
          {
            calId,
            calLink: "link",
            patch,
          }
        )
      );
      expect(state.list[calId].name).toBe("N");
      expect(state.list[calId].description).toBe("D");
      expect(state.list[calId].color?.["apple:color"]).toBe("#00f");
    });

    it("removeCalendarAsync.fulfilled deletes calendar", () => {
      const prev = {
        ...initialState,
        list: { c1: { id: "c1" } as any },
      };
      const state = reducer(
        prev,
        removeCalendarAsync.fulfilled({ calId: "c1" }, "req2", {
          calId: "c1",
          calLink: "l",
        })
      );
      expect(state.list).toEqual({});
    });

    it("patchACLCalendarAsync.fulfilled sets visibility", () => {
      const prev = {
        ...initialState,
        list: { c1: { id: "c1", visibility: "public" } as any },
      };
      const state = reducer(
        prev,
        patchACLCalendarAsync.fulfilled(
          { calId: "c1", calLink: "l", request: "" },
          "req3",
          { calId: "c1", calLink: "l", request: "" }
        )
      );
      expect(state.list.c1.visibility).toBe("private");
    });

    it("createCalendarAsync.fulfilled adds a new calendar", () => {
      const payload = {
        userId: "u1",
        calId: "cal1",
        color: { "apple:color": "#f00" },
        name: "Test",
        desc: "Desc",
        owner: "Owner",
        ownerEmails: ["o@example.com"],
      };
      const state = reducer(
        initialState,
        createCalendarAsync.fulfilled(payload, "req4", payload)
      );
      expect(state.list["u1/cal1"].name).toBe("Test");
      expect(state.list["u1/cal1"].color?.["apple:color"]).toBe("#f00");
    });

    it("addSharedCalendarAsync.fulfilled adds shared calendar", () => {
      const payload = {
        calId: "c1",
        color: { "apple:color": "#0f0" },
        link: "/calendars/u1/c1.json",
        name: "Shared",
        desc: "Shared Desc",
        owner: "O",
        ownerEmails: ["o@example.com"],
      };
      const mockCal = {
        cal: {
          _links: { self: { href: "/calendars/u1/c1.json" } },
          "apple:color": "#0f0",
          "caldav:description": "Shared Desc",
          "dav:name": "Shared",
        },
      };
      const state = reducer(
        initialState,
        addSharedCalendarAsync.fulfilled(payload, "req5", {
          userId: "u1",
          calId: "c1",
          cal: mockCal,
        })
      );
      expect(state.list["c1"].name).toBe("Shared");
    });

    it("getTempCalendarsListAsync.fulfilled updates templist", () => {
      const payload = {
        t1: {
          id: "t1",
          name: "Temp",
          color: { "apple:color": "#aaa" },
          events: {},
          visibility: "public",
          owner: "O",
          ownerEmails: ["o@o.com"],
          link: "/calendars/t1.json",
          description: "desc",
        } as Calendar,
      };
      const state = reducer(
        initialState,
        getTempCalendarsListAsync.fulfilled(payload, "req7", {
          openpaasId: "u1",
          color: { "apple:color": "#aaa" },
          displayName: "test",
          avatarUrl: "",
          email: "test@test.com",
        })
      );
      expect(state.templist.t1.name).toBe("Temp");
    });

    it("getEventAsync.fulfilled adds single event", () => {
      const payload = { calId: "c1", event: { uid: "e1" } as any };
      const state = reducer(
        initialState,
        getEventAsync.fulfilled(payload, "req9", { uid: "e1" } as any)
      );
      expect(state.list.c1.events.e1.uid).toBe("e1");
    });

    it("getCalendarDetailAsync.fulfilled adds calendar events", () => {
      const payload = { calId: "c1", events: [{ uid: "e1" }] as any[] };
      const state = reducer(
        {
          ...initialState,
          list: {
            ["c1"]: {
              id: "c1",
              events: {},
            } as unknown as Calendar,
          },
        },
        getCalendarDetailAsync.fulfilled(payload, "req11", {
          calId: "c1",
          match: { start: "", end: "" },
        })
      );
      expect(state.list.c1.events.e1.uid).toBe("e1");
    });
  });
});
