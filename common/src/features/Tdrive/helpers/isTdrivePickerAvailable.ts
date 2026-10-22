/**
 * Whether the Tdrive file picker can be opened: Tdrive is enabled and its URL
 * is configured.
 *
 * This gates the picker only. Attachments already carried by an event are
 * plain iCalendar `ATTACH` properties and are displayed regardless.
 */
export const isTdrivePickerAvailable = (): boolean =>
  Boolean(window.TDRIVE_INTENT_URL) && Boolean(window.TDRIVE_ENABLED)
