export interface RegisterCalendarsTextKeys {
  title: string
  searchLabel: string
  searchPlaceholder: string
}

const RESOURCE_TEXT_KEYS: RegisterCalendarsTextKeys = {
  title: 'calendar.browseResources',
  searchLabel: 'resourceSearch.label',
  searchPlaceholder: 'resourceSearch.placeholder'
}

const OTHER_CALENDARS_TEXT_KEYS: RegisterCalendarsTextKeys = {
  title: 'calendar.browseOtherCalendars',
  searchLabel: 'peopleSearch.label',
  searchPlaceholder: 'peopleSearch.placeholder'
}

const isResourceOnly = (objectTypes: string[]): boolean =>
  objectTypes.length > 0 && objectTypes.every(type => type === 'resource')

export const getRegisterCalendarsTextKeys = (
  objectTypes: string[]
): RegisterCalendarsTextKeys =>
  isResourceOnly(objectTypes) ? RESOURCE_TEXT_KEYS : OTHER_CALENDARS_TEXT_KEYS
