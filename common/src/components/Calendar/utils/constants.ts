export const CALENDAR_VIEWS = {
  dayGridMonth: 'dayGridMonth',
  timeGridWeek: 'timeGridWeek',
  timeGridDay: 'timeGridDay',
  listWeek: 'listWeek',
  listMonth: 'listMonth'
}

// The schedule: the events as a list, of a week or of a month
export const isListView = (view: string): boolean =>
  view === CALENDAR_VIEWS.listWeek || view === CALENDAR_VIEWS.listMonth
