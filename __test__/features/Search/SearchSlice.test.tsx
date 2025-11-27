// SearchSlice.test.ts
import { configureStore } from "@reduxjs/toolkit";
import searchResultReducer, {
  searchEventsAsync,
  setResults,
  setHits,
} from "../../../src/features/Search/SearchSlice";
import * as EventApi from "../../../src/features/Events/EventApi";

jest.mock("../../../src/features/Events/EventApi");

describe("SearchSlice", () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        searchResult: searchResultReducer,
      },
    });
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const state = store.getState().searchResult;
      expect(state).toEqual({
        results: [],
        hits: 0,
        error: null,
        loading: false,
      });
    });
  });

  describe("reducers", () => {
    it("should handle setResults", () => {
      const mockResults = [
        { uid: "1", summary: "Event 1" },
        { uid: "2", summary: "Event 2" },
      ];
      store.dispatch(setResults(mockResults as any));
      expect(store.getState().searchResult.results).toEqual(mockResults);
    });

    it("should handle setHits", () => {
      store.dispatch(setHits(42));
      expect(store.getState().searchResult.hits).toBe(42);
    });
  });

  describe("searchEventsAsync", () => {
    const mockFilters = {
      searchIn: ["user1/calendar1"],
      keywords: "meeting",
      organizers: ["user@example.com"],
      attendees: ["attendee@example.com"],
    };

    it("should handle successful search", async () => {
      const mockResponse = {
        _total_hits: 5,
        _embedded: {
          events: [
            { data: { uid: "1", summary: "Test Event" } },
            { data: { uid: "2", summary: "Another Event" } },
          ],
        },
      };

      (EventApi.searchEvent as jest.Mock).mockResolvedValue(mockResponse);

      await store.dispatch(
        searchEventsAsync({ search: "test", filters: mockFilters })
      );

      const state = store.getState().searchResult;
      expect(state.loading).toBe(false);
      expect(state.hits).toBe(5);
      expect(state.results).toEqual(mockResponse._embedded.events);
      expect(state.error).toBeNull();
    });

    it("should handle search with no results", async () => {
      const mockResponse = {
        _total_hits: 0,
        _embedded: { events: [] },
      };

      (EventApi.searchEvent as jest.Mock).mockResolvedValue(mockResponse);

      await store.dispatch(
        searchEventsAsync({ search: "nonexistent", filters: mockFilters })
      );

      const state = store.getState().searchResult;
      expect(state.hits).toBe(0);
      expect(state.results).toEqual([]);
    });

    it("should handle search error", async () => {
      const mockError = new Error("Network error");
      (EventApi.searchEvent as jest.Mock).mockRejectedValue(mockError);

      await store.dispatch(
        searchEventsAsync({ search: "test", filters: mockFilters })
      );

      const state = store.getState().searchResult;
      expect(state.loading).toBe(false);
      expect(state.error).toBeTruthy();
      expect(state.results).toEqual([]);
    });

    it("should set loading state during search", async () => {
      (EventApi.searchEvent as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const promise = store.dispatch(
        searchEventsAsync({ search: "test", filters: mockFilters })
      );

      expect(store.getState().searchResult.loading).toBe(true);
      await promise;
    });
  });
});
