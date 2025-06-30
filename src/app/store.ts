import { combineReducers, configureStore } from "@reduxjs/toolkit";
import userReducer from "../features/User/userSlice";
import eventsReducer from "../features/Events/EventsSlice";
import eventsCalendar from "../features/Calendars/CalendarSlice";
import { createReduxHistoryContext } from "redux-first-history";
import { createBrowserHistory } from "history";

const { createReduxHistory, routerMiddleware, routerReducer } =
  createReduxHistoryContext({ history: createBrowserHistory() });

const rootReducer = combineReducers({
  router: routerReducer,
  user: userReducer,
  events: eventsReducer,
  calendars: eventsCalendar,
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
