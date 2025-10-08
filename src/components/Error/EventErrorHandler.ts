export class EventErrorHandler {
  private errors = new Map<string, string>();
  private onErrorCallback?: (messages: string[]) => void;

  setErrorCallback(callback: (messages: string[]) => void) {
    this.onErrorCallback = callback;
  }

  reportError(eventId: string, message: string) {
    if (!this.errors.has(eventId)) {
      this.errors.set(eventId, message);
      console.warn(`[EventErrorHandler] ${eventId}: ${message}`);
      this.emit();
    }
  }

  clearAll() {
    this.errors.clear();
    this.emit();
  }

  private emit() {
    this.onErrorCallback?.(Array.from(this.errors.values()));
  }
}
