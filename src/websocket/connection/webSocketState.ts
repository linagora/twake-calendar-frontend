import { type MutableRefObject } from "react";
import type { WebSocketWithCleanup } from "./types";

interface WebSocketState {
  socketRef: MutableRefObject<WebSocketWithCleanup | null> | null;
  triggerReconnect: (() => void) | null;
  isConnecting: boolean;
}

const state: WebSocketState = {
  socketRef: null,
  triggerReconnect: null,
  isConnecting: false,
};

export function registerWebSocketState(
  socketRef: React.MutableRefObject<WebSocketWithCleanup | null>,
  triggerReconnect: () => void
) {
  state.socketRef = socketRef;
  state.triggerReconnect = triggerReconnect;
}

export function setWebSocketConnecting(value: boolean) {
  state.isConnecting = value;
}

export function getWebSocketState(): Readonly<WebSocketState> {
  return state;
}
