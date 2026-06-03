import { createAppSlice } from '@common/app/createAppSlice'
import { Calendar } from '@common/types/CalendarTypes'
import {
  addEventReducer,
  clearErrorReducer,
  clearFetchCacheReducer,
  createCalendarReducer,
  emptyEventsCalReducer,
  removeEventReducer,
  removeTempCalReducer,
  setCalendarErrorReducer,
  setIsMobileSearchOpenReducer,
  updateCalColorReducer,
  updateEventLocalReducer
} from './reducers'
import {
  addCalendarResourceThunk,
  addSharedCalendarThunk,
  createCalendarThunk,
  deleteEventInstanceThunk,
  deleteEventThunk,
  getCalendarDetailThunk,
  getCalendarsListThunk,
  getEventThunk,
  getTempCalendarsListThunk,
  importEventFromFileThunk,
  moveEventThunk,
  patchACLCalendarThunk,
  patchCalendarThunk,
  putEventThunk,
  refreshCalendarWithSyncToken as refreshCalendarWithSyncTokenAction,
  removeCalendarThunk,
  updateEventInstanceThunk,
  updateSeriesThunk
} from './services'
import { updateDelegationCalendarThunk } from './services/updateDelegationCalendarAsync'

export interface CalendarState {
  list: Record<string, Calendar>
  templist: Record<string, Calendar>
  pending: boolean
  error: string | null
  isMobileSearchOpen: boolean
}

const CalendarSlice = createAppSlice({
  name: 'calendars',
  initialState: {
    list: {} as Record<string, Calendar>,
    templist: {} as Record<string, Calendar>,
    pending: true,
    error: null as string | null,
    isMobileSearchOpen: false
  } as CalendarState,
  reducers: create => ({
    // Regular reducers
    createCalendar: createCalendarReducer(create),
    addEvent: addEventReducer(create),
    removeEvent: removeEventReducer(create),
    removeTempCal: removeTempCalReducer(create),
    emptyEventsCal: emptyEventsCalReducer(create),
    updateEventLocal: updateEventLocalReducer(create),
    clearFetchCache: clearFetchCacheReducer(create),
    setCalendarError: setCalendarErrorReducer(create),
    clearError: clearErrorReducer(create),
    updateCalColor: updateCalColorReducer(create),
    setIsMobileSearchOpen: setIsMobileSearchOpenReducer(create),
    //  thunks using create.asyncThunk
    getCalendarsList: getCalendarsListThunk(create),
    getTempCalendarsList: getTempCalendarsListThunk(create),
    getCalendarDetail: getCalendarDetailThunk(create),
    putEvent: putEventThunk(create),
    getEvent: getEventThunk(create),
    moveEvent: moveEventThunk(create),
    deleteEvent: deleteEventThunk(create),
    deleteEventInstance: deleteEventInstanceThunk(create),
    updateEventInstance: updateEventInstanceThunk(create),
    updateSeries: updateSeriesThunk(create),
    createCalendarAsync: createCalendarThunk(create),
    patchCalendar: patchCalendarThunk(create),
    addSharedCalendar: addSharedCalendarThunk(create),
    addCalendarResource: addCalendarResourceThunk(create),
    removeCalendar: removeCalendarThunk(create),
    patchACLCalendar: patchACLCalendarThunk(create),
    importEventFromFile: importEventFromFileThunk(create),
    refreshCalendarWithSyncToken: refreshCalendarWithSyncTokenAction(create),
    updateDelegationCalendar: updateDelegationCalendarThunk(create)
  })
})

export const {
  addEvent,
  removeEvent,
  createCalendar,
  updateEventLocal,
  removeTempCal,
  emptyEventsCal,
  clearFetchCache,
  setCalendarError,
  clearError,
  updateCalColor,
  setIsMobileSearchOpen,
  //  thunks
  getCalendarsList,
  getTempCalendarsList,
  getCalendarDetail,
  putEvent,
  getEvent,
  moveEvent,
  deleteEvent,
  deleteEventInstance,
  updateEventInstance,
  updateSeries,
  createCalendarAsync,
  patchCalendar,
  addSharedCalendar,
  addCalendarResource,
  removeCalendar,
  patchACLCalendar,
  importEventFromFile,
  refreshCalendarWithSyncToken,
  updateDelegationCalendar
} = CalendarSlice.actions

export default CalendarSlice.reducer
