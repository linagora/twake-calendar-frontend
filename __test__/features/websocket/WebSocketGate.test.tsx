import { render, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { createWebSocketConnection } from "../../../src/websocket/createWebSocketConnection";
import { registerToCalendars } from "../../../src/websocket/ws/registerToCalendars";
import { WebSocketGate } from "../../../src/websocket/WebSocketGate";
import { setupWebsocket } from "./utils/setupWebsocket";

jest.mock("../../../src/websocket/createWebSocketConnection");
jest.mock("../../../src/websocket/ws/registerToCalendars");

describe("WebSocketGate", () => {
  let mockWebSocket: jest.Mock;
  let store: any;
  let cleanup: () => void;

  beforeEach(() => {
    // Setup the real WebSocket mock
    const setup = setupWebsocket();
    cleanup = setup.cleanup;
    mockWebSocket = setup.mockWebSocket;

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
    // Configure the mock to return a socket that's not open
    const mockSocket = {
      readyState: WebSocket.CONNECTING,
      close: jest.fn(),
      OPEN: WebSocket.OPEN,
    };
    (createWebSocketConnection as jest.Mock).mockResolvedValue(mockSocket);

    const storeWithCalendars = configureStore({
      reducer: {
        user: (
          state = { userData: { id: "1" }, tokens: { access: "token" } }
        ) => state,
        calendars: (
          state = {
            list: {
              cal1: { id: "cal1", name: "Calendar 1" },
            },
          }
        ) => state,
      },
    });

    render(
      <Provider store={storeWithCalendars}>
        <WebSocketGate />
      </Provider>
    );

    await waitFor(() => {
      expect(createWebSocketConnection).toHaveBeenCalled();
    });

    expect(registerToCalendars).not.toHaveBeenCalled();
  });
});
