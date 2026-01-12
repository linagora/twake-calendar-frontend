import { render, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { createWebSocketConnection } from "../../../src/websocket/createWebSocketConnection";
import { registerToCalendars } from "../../../src/websocket/websocketAPI/registerToCalendars";
import { WebSocketGate } from "../../../src/websocket/WebSocketGate";
import { setupWebsocket } from "./utils/setupWebsocket";

jest.mock("../../../src/websocket/createWebSocketConnection");
jest.mock("../../../src/websocket/websocketAPI/registerToCalendars");

describe("WebSocketGate", () => {
  let mockWebSocket: jest.Mock;
  let store: any;

  beforeEach(() => {
    // Setup the real WebSocket mock
    const setup = setupWebsocket();
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
    mockWebSocket.readyState = WebSocket.CONNECTING;

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
