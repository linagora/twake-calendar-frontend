export function setupWebsocket() {
  const originalWebSocket = global.WebSocket;
  const webSocketInstances: any[] = [];
  const mockWebSocket = jest.fn().mockImplementation((url: string) => {
    const ws = {
      url,
      readyState: WebSocket.CONNECTING,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
      _listeners: {} as Record<string, Function[]>,
    };

    ws.addEventListener.mockImplementation((event, handler) => {
      ws._listeners[event] ??= [];
      ws._listeners[event].push(handler);
    });

    ws.removeEventListener.mockImplementation((event, handler) => {
      ws._listeners[event] =
        ws._listeners[event]?.filter((h) => h !== handler) ?? [];
    });

    webSocketInstances.push(ws);
    return ws;
  });

  global.WebSocket = mockWebSocket as any;
  const cleanup = () => {
    global.WebSocket = originalWebSocket;
    webSocketInstances.length = 0;
  };
  return { webSocketInstances, mockWebSocket, cleanup };
}
