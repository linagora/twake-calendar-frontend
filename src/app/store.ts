import eventsCalendar from "@/features/Calendars/CalendarSlice";
import searchResultReducer from "@/features/Search/SearchSlice";
import settingsReducer from "@/features/Settings/SettingsSlice";
import userReducer from "@/features/User/userSlice";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { createBrowserHistory } from "history";
import { createReduxHistoryContext } from "redux-first-history";

const { createReduxHistory, routerMiddleware, routerReducer } =
  createReduxHistoryContext({ history: createBrowserHistory() });

const rootReducer = combineReducers({
  router: routerReducer,
  user: userReducer,
  calendars: eventsCalendar,
  settings: settingsReducer,
  searchResult: searchResultReducer,
});

export const setupStore = (preloadedState?: Partial<RootState>) => {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(routerMiddleware),
  });
};

export const store = setupStore();

export const history = createReduxHistory(store);

export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore["dispatch"];
