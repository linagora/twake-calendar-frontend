import { cleanup, render, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { createWebSocketConnection } from "../../../src/websocket/createWebSocketConnection";
import { registerToCalendars } from "../../../src/websocket/ws/registerToCalendars";
import { WebSocketGate } from "../../../src/websocket/WebSocketGate";

jest.mock("../../../src/websocket/createWebSocketConnection");
jest.mock("../../../src/websocket/ws/registerToCalendars");

describe("WebSocketGate", () => {
  let store: any;

  beforeEach(() => {
    // Setup the real WebSocket mock

    store = configureStore({
      reducer: {
        user: (
          state = { userData: { id: "1" }, tokens: { access: "token" } }
        ) => state,
        calendars: (state = { list: {} }) => state,
      },
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it("should not create connection when user is not authenticated", () => {
    const unauthStore = configureStore({
      reducer: {
        user: (state = { userData: null, tokens: null }) => state,
        calendars: (state = { list: {} }) => state,
      },
    });

    render(
      <Provider store={unauthStore}>
        <WebSocketGate />
      </Provider>
    );

    expect(createWebSocketConnection).not.toHaveBeenCalled();
  });

  it("should create connection when user is authenticated", async () => {
    const mockSocket = {
      readyState: WebSocket.OPEN,
      close: jest.fn(),
      addEventListener: jest.fn(),
    };
    (createWebSocketConnection as jest.Mock).mockResolvedValue(mockSocket);
    render(
      <Provider store={store}>
        <WebSocketGate />
      </Provider>
    );

    await waitFor(() => {
      expect(createWebSocketConnection).toHaveBeenCalledTimes(1);
    });
  });

  it("should not register if socket is not open", async () => {
    // Setup localStorage with selected calendars
    localStorage.setItem("selectedCalendars", JSON.stringify(["cal1", "cal2"]));
    (createWebSocketConnection as jest.Mock).mockReset();

    const mockSocket = {
      readyState: WebSocket.CONNECTING,
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    (createWebSocketConnection as jest.Mock).mockResolvedValue(mockSocket);

    const { unmount } = render(
      <Provider store={store}>
        <WebSocketGate />
      </Provider>
    );

    await waitFor(() => {
      expect(createWebSocketConnection).toHaveBeenCalled();
    });

    expect(registerToCalendars).not.toHaveBeenCalled();

    unmount();
    localStorage.clear();
  });
});
