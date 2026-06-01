import { createAppSlice } from '@common/app/createAppSlice'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { extractEventBaseUuid } from '@common/utils/extractEventBaseUuid'
import { PayloadAction } from '@reduxjs/toolkit'
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
    createCalendar: create.reducer(
      (
        state,
        action: PayloadAction<Record<string, string | Record<string, string>>>
      ) => {
        const id = Date.now().toString(36)
        state.list[id] = {} as Calendar
        state.list[id].name = action.payload.name as string
        state.list[id].color = action.payload.color as Record<string, string>
        state.list[id].description = action.payload.description as string
        state.list[id].events = {}
      }
    ),
    addEvent: create.reducer(
      (
        state,
        action: PayloadAction<{ calendarUid: string; event: CalendarEvent }>
      ) => {
        if (!state.list[action.payload.calendarUid].events) {
          state.list[action.payload.calendarUid].events = {}
        }
        state.list[action.payload.calendarUid].events[
          action.payload.event.uid
        ] = action.payload.event
        state.list[action.payload.calendarUid].events[
          action.payload.event.uid
        ].URL =
          `/calendars/${action.payload.calendarUid}/${extractEventBaseUuid(
            action.payload.event.uid
          )}.ics`
      }
    ),
    removeEvent: create.reducer(
      (
        state,
        action: PayloadAction<{ calendarUid: string; eventUid: string }>
      ) => {
        delete state.list[action.payload.calendarUid].events[
          action.payload.eventUid
        ]
      }
    ),
    removeTempCal: create.reducer((state, action: PayloadAction<string>) => {
      delete state.templist[action.payload]
    }),
    emptyEventsCal: create.reducer(
      (state, action: PayloadAction<{ calId?: string; calType?: 'temp' }>) => {
        const cals =
          action.payload.calType === 'temp' ? state.templist : state.list
        if (action.payload.calId) {
          cals[action.payload.calId].events = {}
        } else {
          Object.keys(state.templist).forEach(
            calId => (cals[calId].events = {})
          )
        }
      }
    ),
    updateEventLocal: create.reducer(
      (
        state,
        action: PayloadAction<{ calId: string; event: CalendarEvent }>
      ) => {
        const { calId, event } = action.payload
        state.list[calId].events[event.uid] = event
      }
    ),
    clearFetchCache: create.reducer((state, action: PayloadAction<string>) => {
      if (!state.list[action.payload]) return
      state.list[action.payload].lastCacheCleared = Date.now()
    }),
    setCalendarError: create.reducer((state, action: PayloadAction<string>) => {
      state.error = action.payload
    }),
    clearError: create.reducer(state => {
      state.error = null
    }),
    updateCalColor: create.reducer(
      (
        state,
        action: PayloadAction<{
          id: string
          color: { light: string; dark: string }
        }>
      ) => {
        state.list[action.payload.id].color = action.payload.color
      }
    ),
    setIsMobileSearchOpen: create.reducer(
      (state, action: PayloadAction<boolean>) => {
        state.isMobileSearchOpen = action.payload
      }
    ),
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
