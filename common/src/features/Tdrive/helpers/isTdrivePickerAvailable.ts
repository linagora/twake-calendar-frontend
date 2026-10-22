/**
 * Whether the Tdrive file picker can be opened: Tdrive is enabled and the
 * user's platform, which hosts it, is known.
 *
 * This gates the picker only. Attachments already carried by an event are
 * plain iCalendar `ATTACH` properties and are displayed regardless.
 */
export const isTdrivePickerAvailable = (platformURL: string | null): boolean =>
  Boolean(platformURL) && Boolean(window.TDRIVE_ENABLED)
