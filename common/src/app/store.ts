import eventsCalendar from '@common/features/Calendars/CalendarSlice'
import { postMutationRefreshMiddleware } from '@common/features/Calendars/listeners/postMutationRefresh'
import searchResultReducer from '@common/features/Search/SearchSlice'
import settingsReducer from '@common/features/Settings/SettingsSlice'
import userReducer from '@common/features/User/UserSlice'
import { combineReducers, configureStore } from '@reduxjs/toolkit'
import loadingReducer from './loadingSlice'
import { createBrowserHistory } from 'history'
import { createReduxHistoryContext } from 'redux-first-history'

const { createReduxHistory, routerMiddleware, routerReducer } =
  createReduxHistoryContext({ history: createBrowserHistory() })

const rootReducer = combineReducers({
  router: routerReducer,
  user: userReducer,
  calendars: eventsCalendar,
  settings: settingsReducer,
  searchResult: searchResultReducer,
  loading: loadingReducer
})

export const setupStore = (preloadedState?: Partial<RootState>) => {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        serializableCheck: {
          // Class instances are intentionally stored here for .asJcal() serialization; plain data remains inspectable in devtools
          ignoredActionPaths: ['payload.events'], // suppress during the fulfilled action check
          ignoredPaths: [
            /^calendars\.list\..+\.events/, // suppress state checks for events
            'user.organiserData' // userOrganiser instance, stored for asJcal()/asMailto()
          ]
        }
      })
        .concat(routerMiddleware)
        .prepend(postMutationRefreshMiddleware.middleware)
  })
}

export const store = setupStore()

export const history = createReduxHistory(store)

export type RootState = ReturnType<typeof rootReducer>
export type AppStore = ReturnType<typeof setupStore>
export type AppDispatch = AppStore['dispatch']
