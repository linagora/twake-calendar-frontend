# End to end test plan

Backlog of scenarios for the [`e2e/`](e2e) suite. One line, one test.

- **Past incidents — 49 tests**: bugs and regressions this project has already shipped at
  least once. They are the cheapest tests to justify and the most likely to fire again.
- **Essential — 195 tests**: every basic feature working as intended. Until they are all green,
  a regression can slip through.
- **Bonus — 314 tests**: the peripheral features, the edge cases, accessibility, responsive
  layouts and robustness.

Measured cost: **~4.5 s per test** once the stack is up (~20 s, once per run). The 558 tests
of this document therefore amount to roughly **45 minutes** of CI. See
[`e2e/README.md`](e2e/README.md) for how to write one, and its Isolation section for how
accounts are handed out.

## How to use this list

- Tick the box when the test is written **and** green.
- The identifier (`RECUR-07`) is stable: quote it in the method name or in a `@DisplayName`,
  it is what keeps the backlog and the code connected.
- One test, one behaviour a user can observe. If the sentence does not describe what a user
  sees or gets, it is a badly written test.
- Where it makes sense, back the UI assertion with a backend one through `CalendarProbe`: the
  screen can lie, CalDAV cannot.
- A scenario nobody can assert yet stays an **unticked line here, with a note** saying what
  stands in the way. It gets no placeholder in the suite: no `@Disabled`, no skipped test. The
  suite holds tests that run, and this document holds everything else.
- Every test receives a brand new `E2EUser` of its own. Multi user scenarios ask
  `E2EUserFactory` for the extra accounts and `E2ESessions` for their sessions — accounts are
  created on the fly in the directory, with no cap on how many.

---

# Past incidents (49)

Drawn from the [issue tracker](https://github.com/linagora/twake-calendar-frontend/issues):
708 issues read, 233 labelled `bug`, 46 labelled `REGRESSION`. Each line below reproduces a
defect that actually reached a user, and cites the issue it came from.

Two reasons to start here rather than at the top. A bug that shipped once has already proven
that nothing in the current pipeline catches it. And the same handful of areas keeps coming
back — a third of this list is recurrence, which is exactly what the `RECUR-*` families cover
from the other direction.

Pure display defects are deliberately absent: alignment, margins, z-index, colours, blinking
and double scrollbars belong to pixel level tooling, not to this suite.

## PAST — Recurrence and occurrences (18)

- [x] `PAST-01` Toggling repeat on a new event produces a valid RRULE, never `count: 0` ([#1277](https://github.com/linagora/twake-calendar-frontend/issues/1277))
- [x] `PAST-02` Editing one instance of a weekly series opens that instance, at its own date and in its own timezone ([#489](https://github.com/linagora/twake-calendar-frontend/issues/489))
- [x] `PAST-03` Deleting a second occurrence does not resurrect the ones deleted before it ([#938](https://github.com/linagora/twake-calendar-frontend/issues/938))
- [x] `PAST-04` Renaming one occurrence of a series bounded by `UNTIL` does not make the series vanish from the grid ([#1004](https://github.com/linagora/twake-calendar-frontend/issues/1004))
- [x] `PAST-05` An overridden instance is written once, with a `RECURRENCE-ID` in the same date-time form as `DTSTART` ([#819](https://github.com/linagora/twake-calendar-frontend/issues/819))
- [x] `PAST-06` No VEVENT ever carries both an `RRULE` and a `RECURRENCE-ID` ([#466](https://github.com/linagora/twake-calendar-frontend/issues/466))
- [x] `PAST-07` A recurrence ending on a date writes an RFC 5545 compliant `UNTIL`, matching the `DTSTART` precision ([#748](https://github.com/linagora/twake-calendar-frontend/issues/748))
- [x] `PAST-08` Updating a recurring event whose rule carries `WKST` does not return 500 ([#860](https://github.com/linagora/twake-calendar-frontend/issues/860))
- [x] `PAST-09` Deleting an occurrence through `EXDATE` increments the `SEQUENCE` of the master ([#1217](https://github.com/linagora/twake-calendar-frontend/issues/1217))
- [x] `PAST-10` Renaming a whole series keeps its exceptions; only a date change may reset them ([#352](https://github.com/linagora/twake-calendar-frontend/issues/352))
- [x] `PAST-11` A guest accepting a series that holds an exception does not overwrite that exception ([#229](https://github.com/linagora/twake-calendar-frontend/issues/229))
- [x] `PAST-12` Inviting someone on a single occurrence keeps the other guests' answers on it ([#299](https://github.com/linagora/twake-calendar-frontend/issues/299))
- [x] `PAST-13` Turning a recurring event into a simple one stops offering the this-event / all-events dialog ([#364](https://github.com/linagora/twake-calendar-frontend/issues/364))
- [x] `PAST-14` A daily series shows on every day of the last week of the month view, spill-over days included ([#263](https://github.com/linagora/twake-calendar-frontend/issues/263))
- [x] `PAST-15` Changing a rule from every day to every two days keeps the master occurrence visible ([#441](https://github.com/linagora/twake-calendar-frontend/issues/441))
- [x] `PAST-16` Editing a single occurrence does not offer to move it to another calendar ([#916](https://github.com/linagora/twake-calendar-frontend/issues/916))
- [x] `PAST-17` The preview of a recurring event states its rule, including interval and count ([#442](https://github.com/linagora/twake-calendar-frontend/issues/442))
- [x] `PAST-18` The recurrence interval never accepts a float ([#961](https://github.com/linagora/twake-calendar-frontend/issues/961))

## PAST — Timezones (4)

- [x] `PAST-19` The update modal reopens an event in the timezone it was created with ([#490](https://github.com/linagora/twake-calendar-frontend/issues/490))
- [x] `PAST-20` Answering an invitation twice never normalises `DTSTART` to UTC and drops its `TZID` ([#1031](https://github.com/linagora/twake-calendar-frontend/issues/1031))
- [x] `PAST-21` A user in Asia/Jakarta sees a Monday event on Monday ([#632](https://github.com/linagora/twake-calendar-frontend/issues/632))
- [x] `PAST-22` Picking an explicit timezone in the form creates the event at that timezone's hour, not the local one ([#896](https://github.com/linagora/twake-calendar-frontend/issues/896))

## PAST — All day events (4)

- [x] `PAST-23` Renaming an all day event does not stretch it over two days ([#425](https://github.com/linagora/twake-calendar-frontend/issues/425))
- [x] `PAST-24` Creating an all day event on the clicked day lands on that day, not the one before ([#870](https://github.com/linagora/twake-calendar-frontend/issues/870))
- [x] `PAST-25` Dragging an all day event one day back moves it exactly one day back ([#942](https://github.com/linagora/twake-calendar-frontend/issues/942))
- [x] `PAST-26` The time inputs stay hidden for an all day event, multi day ones included ([#774](https://github.com/linagora/twake-calendar-frontend/issues/774))

## PAST — Guests and attendance (5)

- [x] `PAST-27` Editing an event does not reset the guests' answers ([#307](https://github.com/linagora/twake-calendar-frontend/issues/307))
- [x] `PAST-28` Changing the time of an event keeps the organizer accepted, while resetting the guests ([#324](https://github.com/linagora/twake-calendar-frontend/issues/324))
- [x] `PAST-29` The guest count of the preview matches the actual number of guests ([#500](https://github.com/linagora/twake-calendar-frontend/issues/500))
- [x] `PAST-30` An address unknown to the directory is kept when the guest field loses focus, without pressing Enter ([#548](https://github.com/linagora/twake-calendar-frontend/issues/548))
- [x] `PAST-31` Guests are written with `ROLE=REQ-PARTICIPANT`, the organizer alone as `CHAIR` ([#319](https://github.com/linagora/twake-calendar-frontend/issues/319))

## PAST — Calendars (4)

- [ ] `PAST-33` Deleting a personal calendar leaves the user on the calendar, never on a blank page ([#213](https://github.com/linagora/twake-calendar-frontend/issues/213))
- [x] `PAST-34` A calendar created with a custom colour still renders after a reload ([#242](https://github.com/linagora/twake-calendar-frontend/issues/242))
- [x] `PAST-35` A personal calendar can be unticked ([#159](https://github.com/linagora/twake-calendar-frontend/issues/159))
- [x] `PAST-36` A user cannot delegate their own calendar to themselves and lock themselves out of it ([#908](https://github.com/linagora/twake-calendar-frontend/issues/908))

## PAST — Search (4)

- [ ] `PAST-37` A calendar picked through quick search is displayed in the central grid ([#196](https://github.com/linagora/twake-calendar-frontend/issues/196))
- [x] `PAST-38` Searching again with a different keyword sends the new keyword, not the previous one ([#998](https://github.com/linagora/twake-calendar-frontend/issues/998))
- [ ] `PAST-39` Quick searching a user who delegated their calendar returns that calendar ([#596](https://github.com/linagora/twake-calendar-frontend/issues/596))
- [x] `PAST-40` Cancelling a search before its results arrive leaves no ghost calendar behind ([#271](https://github.com/linagora/twake-calendar-frontend/issues/271))

## PAST — Loading and stability (4)

- [x] `PAST-41` A tab left open and woken up hours later recovers on its own, without a blank page ([#623](https://github.com/linagora/twake-calendar-frontend/issues/623))
- [x] `PAST-42` A 401 on the websocket ticket restarts the SSO flow instead of looping forever ([#488](https://github.com/linagora/twake-calendar-frontend/issues/488))
- [x] `PAST-43` Browsing quickly across many weeks does not flood the API into failure ([#617](https://github.com/linagora/twake-calendar-frontend/issues/617))
- [x] `PAST-44` The mini calendar highlights the current week on load ([#1156](https://github.com/linagora/twake-calendar-frontend/issues/1156))

## PAST — iCalendar interoperability (4)

- [x] `PAST-45` Updating an event preserves the iCalendar properties the SPA does not manage ([#638](https://github.com/linagora/twake-calendar-frontend/issues/638))
- [x] `PAST-46` `SEQUENCE` starts at 1 on creation and grows on every update ([#318](https://github.com/linagora/twake-calendar-frontend/issues/318))
- [x] `PAST-47` A `CN` holding non-ASCII characters is quoted in `ATTENDEE` and `ORGANIZER` ([#789](https://github.com/linagora/twake-calendar-frontend/issues/789))
- [x] `PAST-48` The CalDAV URL shown in the Access tab points at the DAV server, not at the API ([#562](https://github.com/linagora/twake-calendar-frontend/issues/562))

## PAST — Video conferencing and reminders (2)

- [x] `PAST-49` A generated video conference link carries a single slash before the meeting code ([#894](https://github.com/linagora/twake-calendar-frontend/issues/894))
- [ ] `PAST-50` A one week reminder writes a `TRIGGER` of exactly one week ([#1201](https://github.com/linagora/twake-calendar-frontend/issues/1201))

### Not covered yet

Four of the forty nine, each with what stands in the way.

- `PAST-33` (#213) Deleting a calendar. `CAL-10` covers deletion from the essential batch; this
  one only needs re-pointing at it.
- `PAST-37` (#196) and `PAST-39` (#596) Quick searching another user's calendar. The sidebar
  dialog lists the calendars somebody has made *public*, and nothing in the interface makes one:
  the Access tab grants rights to named people only. A user who granted "View all events" still
  comes back as "No publicly available calendars", and their calendar reaches the sidebar
  through the delegation itself rather than through the search.
- `PAST-50` (#1201) The `TRIGGER` of a one week reminder. Picking a reminder leaves the modal in
  a state where `Save` can no longer be located: the option list stays mounted over it, and
  Escape closes the whole modal rather than the list.

---

# Essential (194)

## AUTH — Authentication and session (9)

- [x] `AUTH-01` An unauthenticated visitor is sent to the SSO and lands on their calendar
- [x] `AUTH-02` Reloading the page keeps the session, with no second trip to the SSO
- [x] `AUTH-03` Logging out hands the session over to the SSO end session endpoint
- [x] `AUTH-04` The user menu shows the email address of the signed in account
- [x] `AUTH-05` The menubar avatar carries the initials of the signed in account
- [x] `AUTH-06` Invalid credentials leave the user on the SSO form with an error
- [x] `AUTH-08` The default personal calendar is provisioned on the first login
- [x] `AUTH-09` Opening `/calendar` without a session redirects to the SSO and back to `/calendar`
- [x] `AUTH-10` An expired token triggers a silent re-authentication without losing the current view

## SHELL — Application shell (12)

- [x] `SHELL-01` The menubar exposes Today, Previous, Next, Search, Refresh and the profile
- [x] `SHELL-02` The Create button opens the event creation modal
- [x] `SHELL-03` The sidebar shows the "My calendars" section expanded by default
- [x] `SHELL-04` The sidebar shows the Other calendars and Resources and booking links sections
- [x] `SHELL-05` The mini calendar shows the current month with today selected
- [x] `SHELL-06` Clicking a date in the mini calendar moves the main grid to that date
- [x] `SHELL-07` The mini calendar arrows change month without moving the main grid
- [x] `SHELL-08` Collapsing a sidebar section hides its content
- [x] `SHELL-09` The Refresh button reloads the events of the displayed range
- [x] `SHELL-10` The page title is "Twake Calendar"
- [x] `SHELL-11` The application version is displayed in the settings
- [x] `SHELL-12` No console error is emitted on the initial calendar load

## NAV — Navigation and views (15)

- [x] `NAV-01` Next moves the week view to the following week
- [x] `NAV-02` Today comes back to the current week after browsing away
- [x] `NAV-03` Switching to the month view renders a month grid
- [x] `NAV-04` Switching to the day view narrows the grid down to a single column
- [x] `NAV-05` Switching to the schedule view lists the events in chronological order
- [x] `NAV-06` The week view shows seven day columns
- [x] `NAV-07` Previous from the month view goes back one month
- [x] `NAV-08` Next from the day view moves forward one day
- [x] `NAV-09` The menubar title reflects the displayed period
- [x] `NAV-11` The week number shown matches the current ISO week
- [x] `NAV-12` The current day column is highlighted in the week view
- [x] `NAV-13` The schedule view shows a message when the period holds no event
- [x] `NAV-14` Changing view keeps the displayed date
- [x] `NAV-15` The time grid is scrolled to the current hour on opening
- [x] `NAV-16` Browsing twelve weeks in a row does not duplicate any event

## CRUD — Creating a simple event (21)

- [x] `CRUD-01` An event created from the form shows up in the grid
- [x] `CRUD-02` An event created from the form reaches CalDAV
- [x] `CRUD-03` Description and location typed in the expanded form are persisted
- [x] `CRUD-04` A created event is still there after a reload
- [x] `CRUD-05` An end time before the start time is refused
- [x] `CRUD-06` An all day event is rendered in the all day row
- [x] `CRUD-07` The modal opens collapsed, with the title field focused
- [x] `CRUD-08` The default dates are the displayed day, on the next hour slot
- [x] `CRUD-09` Expanding the modal reveals dates, description, location, notification and visibility
- [x] `CRUD-10` An event without a title is saved and displayed as "Untitled"
- [x] `CRUD-11` Changing the start time shifts the end time accordingly
- [x] `CRUD-13` A malformed time shows "Invalid time format"
- [x] `CRUD-14` A start date in the past warns without blocking
- [x] `CRUD-15` An event spanning several days spreads over the matching columns
- [x] `CRUD-16` Closing the modal with the cross saves nothing
- [x] `CRUD-17` Cancelling after typing a title asks for confirmation before discarding
- [x] `CRUD-18` Dragging a time range in the grid prefills the event times
- [x] `CRUD-19` Selecting a cell in the month view creates an all day event
- [x] `CRUD-20` The default destination calendar is "My calendar"
- [x] `CRUD-21` A 255 character title is accepted and displayed truncated in the grid
- [x] `CRUD-22` Two events on the same slot are laid out side by side

## EDIT — Editing and deleting (20)

- [x] `EDIT-01` Renaming an event updates both the grid and CalDAV
- [x] `EDIT-02` Changing the start time of an event is persisted
- [x] `EDIT-03` Deleting an event removes it from the grid and from CalDAV
- [x] `EDIT-04` Cancelling the edit form leaves the event untouched
- [x] `EDIT-05` Clicking an event opens its preview with title, times and calendar
- [x] `EDIT-06` The preview exposes the Edit, Delete and Export actions
- [x] `EDIT-07` The edit form is prefilled with the values of the event
- [x] `EDIT-08` Adding a description to an existing event is persisted
- [x] `EDIT-09` Removing the location of an existing event is persisted
- [x] `EDIT-10` Changing the date of an event moves it to another column
- [x] `EDIT-11` Turning an event into an all day one moves it to the all day row
- [x] `EDIT-12` Turning an all day event back into a timed one restores valid hours
- [x] `EDIT-13` Moving an event to another personal calendar changes its colour
- [x] `EDIT-14` Closing the preview with Escape changes nothing
- [x] `EDIT-15` Duplicating an event creates an independent copy
- [x] `EDIT-16` Editing the duplicate leaves the original untouched
- [x] `EDIT-17` Exporting an event downloads an .ics file carrying its UID
- [x] `EDIT-18` Deletion is immediate in the grid, with no reload
- [x] `EDIT-19` Editing an event then cancelling restores the original display
- [x] `EDIT-20` Two successive edits of the same event are both persisted

## RECUR — Recurrence, creation (26)

> Top risk area. Every test checks **both** how the occurrences are rendered in the grid **and**
> the `RRULE` actually written to CalDAV: the two drift apart easily.

- [x] `RECUR-01` A new event is "Doesn't repeat" by default, with no RRULE
- [x] `RECUR-02` A daily recurrence shows one occurrence on every day of the week
- [x] `RECUR-03` A daily recurrence writes `FREQ=DAILY;INTERVAL=1`
- [x] `RECUR-04` A daily interval of 2 only shows an occurrence every other day
- [x] `RECUR-05` A daily interval of 3 writes `INTERVAL=3`
- [x] `RECUR-06` Switching to weekly automatically ticks the weekday of the start date
- [x] `RECUR-07` A weekly recurrence on Monday, Wednesday, Friday shows three occurrences
- [x] `RECUR-08` The weekday picker writes `BYDAY=MO,WE,FR` in the right order
- [x] `RECUR-09` Unticking every weekday of a weekly recurrence drops `BYDAY`
- [x] `RECUR-10` A weekly interval of 2 skips every other week
- [x] `RECUR-11` A monthly recurrence falls on the same day of month the next month
- [x] `RECUR-12` A monthly recurrence starting on the 31st creates no occurrence in short months
- [x] `RECUR-13` A monthly interval of 3 behaves as a quarterly recurrence
- [x] `RECUR-14` A yearly recurrence comes back on the same date the following year
- [x] `RECUR-15` Switching from weekly to monthly clears `BYDAY`
- [x] `RECUR-16` The "Always" ending writes neither `COUNT` nor `UNTIL`
- [x] `RECUR-17` The "After N occurrences" ending writes `COUNT=N` and stops at the Nth
- [x] `RECUR-18` An ending after 1 occurrence produces a single event
- [x] `RECUR-19` The "Until" ending writes `UNTIL` and shows nothing past the chosen date
- [x] `RECUR-20` The end date picker refuses a date before the start
- [x] `RECUR-21` Switching from "After" to "Until" clears the occurrence count
- [x] `RECUR-22` Switching to "Always" clears both the occurrence count and the end date
- [x] `RECUR-23` An interval of 0 or a negative one is brought back to 1
- [x] `RECUR-24` A decimal interval is refused on input
- [x] `RECUR-25` A recurrence on an all day event is accepted and rendered in the all day row
- [x] `RECUR-26` The preview of an occurrence spells the rule out ("Every 2 weeks on monday, wednesday")

## RECUR-EDIT — Recurrence, editing and deleting (23)

> Where a regression costs the most: a badly written exception silently corrupts a whole
> series. Always check `RECURRENCE-ID` and `EXDATE` on the CalDAV side.

- [x] `RECUR-EDIT-01` Editing an occurrence opens the "This event / All the events" dialog
- [x] `RECUR-EDIT-02` Cancelling that dialog modifies no occurrence
- [x] `RECUR-EDIT-03` Renaming "this event" only renames the clicked occurrence
- [x] `RECUR-EDIT-04` Renaming "this event" writes an exception carrying `RECURRENCE-ID`
- [x] `RECUR-EDIT-05` Renaming "all the events" renames the whole series
- [x] `RECUR-EDIT-06` Moving the time of a single occurrence leaves the others in place
- [x] `RECUR-EDIT-07` Moving the time of the whole series shifts every occurrence
- [x] `RECUR-EDIT-08` Deleting an occurrence opens the two choice deletion dialog
- [x] `RECUR-EDIT-09` Deleting "this event" removes one occurrence and adds an `EXDATE`
- [x] `RECUR-EDIT-10` Deleting "all the events" clears the series from the calendar
- [x] `RECUR-EDIT-11` Changing the frequency from daily to weekly on the whole series
- [x] `RECUR-EDIT-12` Raising the occurrence count brings the missing occurrences back
- [x] `RECUR-EDIT-13` Lowering the occurrence count removes the extra occurrences
- [x] `RECUR-EDIT-14` Pushing the end date further extends the series
- [x] `RECUR-EDIT-15` Making a recurring event non recurring leaves a single occurrence
- [x] `RECUR-EDIT-16` Making a single event recurring creates the following occurrences
- [x] `RECUR-EDIT-18` Deleting an exception occurrence does not break the rest of the series
- [x] `RECUR-EDIT-19` Adding a guest to a single occurrence leaves the others alone
- [x] `RECUR-EDIT-20` Adding a guest to the whole series invites them on every occurrence
- [x] `RECUR-EDIT-21` Answering on a single occurrence opens the participation status dialog
- [x] `RECUR-EDIT-22` Answering for the whole series applies the status everywhere
- [x] `RECUR-EDIT-23` The preview of an occurrence carries the "Recurrent Event" badge
- [x] `RECUR-EDIT-24` Moving a recurring series to another calendar keeps its rule

## ATT — Guests and invitations (17)

- [x] `ATT-01` Typing a valid email in the guest field adds it to the list
- [x] `ATT-02` An invalid address shows "is not a valid email address" and is not added
- [x] `ATT-03` The directory search suggests the users of the domain
- [x] `ATT-04` Picking a suggestion adds the guest with their display name
- [x] `ATT-05` Removing a guest before saving takes them off the list
- [x] `ATT-06` The organizer is part of the guests and cannot be removed
- [x] `ATT-07` Guests are written as `ATTENDEE` in CalDAV
- [x] `ATT-08` The preview shows the guest count and the breakdown of answers
- [x] `ATT-09` An invited user sees the event show up in their own calendar
- [x] `ATT-10` A guest can accept the invitation from the preview
- [x] `ATT-11` A guest can decline the invitation from the preview
- [x] `ATT-12` A guest can answer "Maybe"
- [x] `ATT-13` A guest's answer reaches the organizer
- [x] `ATT-14` A guest who declined is shown as "Declined"
- [x] `ATT-15` Adding a guest to an existing event sends them the invitation
- [x] `ATT-17` The same guest cannot be added twice
- [x] `ATT-18` "Show more" expands the full guest list beyond the fold

## CAL — Personal calendars (15)

- [x] `CAL-01` The default personal calendar is named "My calendar"
- [x] `CAL-02` Creating a personal calendar adds it to the sidebar
- [x] `CAL-03` A created calendar is visible over CalDAV
- [x] `CAL-04` Unticking a calendar hides its events from the grid
- [x] `CAL-05` Ticking a calendar back shows its events again
- [x] `CAL-06` Renaming a calendar updates the sidebar
- [x] `CAL-07` Changing the colour of a calendar recolours its events
- [x] `CAL-08` The custom colour picker accepts a hexadecimal value
- [x] `CAL-09` Deleting a calendar asks for confirmation, warning about the loss of its events
- [x] `CAL-10` Deleting a calendar removes its events from the grid
- [x] `CAL-11` The default calendar cannot be deleted
- [x] `CAL-12` An event created in a second calendar takes its colour
- [x] `CAL-13` The Access tab shows the CalDAV URL of the calendar
- [x] `CAL-14` The Access tab allows resetting the secret URL
- [x] `CAL-15` The default visibility of new events is configurable per calendar

## SYNC — Live updates and persistence (12)

- [x] `SYNC-01` An event written over CalDAV pops up without a reload
- [x] `SYNC-02` An event deleted over CalDAV is gone after a refresh
- [x] `SYNC-03` Browsing to another week loads the events of that week
- [x] `SYNC-04` An event renamed over CalDAV changes title live
- [x] `SYNC-05` An event moved over CalDAV changes slot live
- [x] `SYNC-06` An incoming invitation shows up live in the guest's calendar
- [x] `SYNC-07` A guest's answer reaches the organizer live
- [ ] `SYNC-08` Losing the websocket shows the "Live updates were interrupted" banner
- [ ] `SYNC-09` Recovering the websocket shows "Live updates are back"
- [x] `SYNC-10` An edit made while offline is replayed on reconnection
- [x] `SYNC-11` Two tabs of the same user stay in sync
- [x] `SYNC-12` A manual refresh catches up on an event the websocket missed

## SEARCH — Search (10)

- [x] `SEARCH-01` Searching a keyword brings back the matching event
- [x] `SEARCH-02` A search with no match shows "No events found"
- [x] `SEARCH-03` The search also covers the description
- [x] `SEARCH-04` The search also covers the location
- [x] `SEARCH-05` The "My calendars" filter narrows the search scope
- [x] `SEARCH-06` The organizer filter narrows the results
- [x] `SEARCH-07` The participant filter narrows the results
- [x] `SEARCH-08` Clicking a result opens the event preview
- [ ] `SEARCH-09` Clearing the search restores the calendar view
- [x] `SEARCH-10` An empty search invites the user to type keywords

## SET — Settings (14)

- [x] `SET-01` Switching the interface to French relabels the menubar
- [x] `SET-02` Turning the week number off removes it from the grid
- [x] `SET-03` The chosen language survives a reload
- [x] `SET-04` Every offered language actually relabels the interface
- [x] `SET-05` Changing the timezone shifts how events are displayed
- [x] `SET-06` Automatic timezone detection can be turned off
- [ ] `SET-07` Choosing working days is persisted
- [x] `SET-08` "Show only working days" hides the weekend from the grid
- [x] `SET-09` "Show declined events" brings a declined event back
- [x] `SET-10` Hiding declined events removes them from the grid
- [x] `SET-11` The email notification delivery method is saved
- [x] `SET-12` The back button returns to the previous calendar view
- [ ] `SET-13` A failed save shows the matching error message
- [x] `SET-14` One user's settings do not affect another's

---

# Bonus (286)

## RES — Resources (18)

- [x] `RES-01` The Resources section lists the resources of the domain
- [x] `RES-02` Browsing resources allows adding one to the sidebar
- [x] `RES-03` Booking a resource from the event form adds it as a participant
- [x] `RES-04` A booked resource shows up in the resource's own calendar
- [x] `RES-05` The resource administrator sees the booking request in resource calendar
- [x] `RES-06` The administrator can accept the booking in resource calendar
- [x] `RES-07` The administrator can decline the booking in resource calendar
- [x] `RES-08` The booking status reaches the organizer (in his calendar event copy)
- [ ] `RES-09` A resource already booked on the slot is flagged as busy — the form computes no
  availability for a room: free/busy resolves an attendee through the directory, and a resource's
  address is not a user, so it is dropped before any status is asked for. Same wall as `FB-10`.
- [x] `RES-10` Removing a resource from an event frees the slot
- [x] `RES-11` Deleting the event frees the resource
- [x] `RES-12` The resource search filters by name
- [x] `RES-13` A resource search with no match shows "No results"
- [x] `RES-14` The resource icon is displayed in the list
- [x] `RES-15` Unticking a resource hides its bookings
- [x] `RES-16` Removing a resource from the sidebar does not delete its bookings
- [x] `RES-17` A non administrator cannot edit the resource calendar
- [x] `RES-18` `HIDE_RESOURCES` hides the Resources section entirely

## TEAM — Team calendars (17)

- [x] `TEAM-01` A team calendar appears in its own section
- [x] `TEAM-02` A viewer member sees the events of the team
- [x] `TEAM-03` A viewer member cannot create an event in the team calendar
- [x] `TEAM-04` An editor member can create an event in the team calendar
- [x] `TEAM-05` An editor member can edit an event of the team
- [x] `TEAM-06` An administrator can delete an event of the team
- [x] `TEAM-08` A team event shows "Team's organizer" in the preview
- [ ] `TEAM-09` The tooltip names the team that organized the event
- [ ] `TEAM-10` A team event is visible live by every member
- [x] `TEAM-11` Unticking the team calendar hides its events
- [ ] `TEAM-12` The team calendar colour is applied to its events
- [x] `TEAM-13` A non member does not see the team calendar
- [x] `TEAM-14` Removing a member revokes their access live
- [x] `TEAM-15` Inviting an external guest from a team calendar works
- [x] `TEAM-16` A recurring team event behaves like a personal recurring one
- [x] `TEAM-17` The team calendar appears in the calendar picker of the form
- [x] `TEAM-18` Moving a personal event to a team calendar changes its organizer

## SHARE — Sharing and delegation (24)

- [x] `SHARE-01` The Access tab allows granting a right to another user
- [x] `SHARE-02` The grantee sees the shared calendar under "Other calendars"
- [ ] `SHARE-03` A read right shows the events without allowing edition
- [x] `SHARE-04` An edit right allows creating an event in the shared calendar
- [ ] `SHARE-05` An edit right allows editing an existing event
- [x] `SHARE-06` An administration right allows managing the shares
- [x] `SHARE-07` Revoking a right removes the calendar from the grantee
- [x] `SHARE-08` The owner is identified in the list of rights
- [ ] `SHARE-11` A private event shows "Details are hidden" to the delegate
- [ ] `SHARE-12` Browsing a user's public calendars offers them for subscription
- [ ] `SHARE-13` Subscribing to a public calendar adds it to the sidebar
- [ ] `SHARE-14` Unsubscribing from a public calendar removes it without deleting it
- [ ] `SHARE-15` A user with no public calendar shows the matching message
- [ ] `SHARE-16` The colours of a shared calendar are per subscriber
- [x] `SHARE-17` Creating an event in a delegated calendar sets the right organizer
- [ ] `SHARE-18` The preview offers "Edit in <calendar>" for a delegated event
- [x] `SHARE-19` A delegate cannot delete the shared calendar
- [x] `SHARE-20` The share survives a logout and login on both sides
- [x] `SHARE-21` An edit made by the delegate is visible live to the owner
- [x] `SHARE-22` Sharing with an address outside the domain is refused
- [x] `SHARE-23` Sharing with oneself is refused
- [x] `SHARE-24` The list of rights is paginated beyond a dozen grantees
- [ ] `SHARE-25` Disabling the sharing module hides the Access tab
- [x] `SHARE-26` A recurring event created by a delegate keeps its rule for the owner

## IMPEX — Import, export, CalDAV (15)

- [x] `IMPEX-01` Importing an .ics file adds its events to the chosen calendar
- [x] `IMPEX-03` Importing an .ics holding a recurrence keeps the rule
- [x] `IMPEX-04` Importing an .ics holding exceptions keeps the `RECURRENCE-ID` entries
- [x] `IMPEX-05` Importing an invalid file shows an explicit error
- [x] `IMPEX-06` Importing an empty file adds nothing and says so
- [x] `IMPEX-09` Importing the same file twice does not duplicate the events
- [x] `IMPEX-10` The import honours the selected destination calendar
- [x] `IMPEX-11` Exporting a calendar downloads an .ics holding all its events
- [x] `IMPEX-12` Exporting an empty calendar produces a valid .ics
- [x] `IMPEX-13` The displayed CalDAV URL accepts an authenticated `PROPFIND`
- [x] `IMPEX-14` The secret URL allows reading the calendar without authentication
- [x] `IMPEX-15` Resetting the secret URL invalidates the previous one
- [x] `IMPEX-16` An event created by a third party CalDAV client shows in the interface
- [x] `IMPEX-17` An imported event in an exotic timezone displays at the right hour
- [x] `IMPEX-20` Exporting a recurring event carries the complete `RRULE`

## BOOK — Booking links, private side (20)

- [x] `BOOK-01` The Booking links section is hidden when the feature is off
- [x] `BOOK-02` Creating a booking link adds it to the sidebar
- [x] `BOOK-04` The slot duration offers 15, 30, 45 minutes, 1 hour and 2 hours
- [x] `BOOK-05` Regular hours are configurable day by day
- [x] `BOOK-06` "Copy to all" replicates a slot onto every day
- [x] `BOOK-07` A day without a slot is marked unavailable
- [x] `BOOK-08` Adding then removing a slot updates the preview
- [x] `BOOK-10` A schedule can be deactivated and reactivated
- [x] `BOOK-11` Copying the booking link puts the URL in the clipboard
- [x] `BOOK-12` Editing an existing schedule is persisted
- [ ] `BOOK-13` Deleting a schedule removes it from the sidebar
- [x] `BOOK-14` A slot already taken by an event is not offered
- [x] `BOOK-15` A confirmed booking creates an event in the owner's calendar
- [x] `BOOK-16` The owner sees the name and email of the person who booked
- [ ] `BOOK-17` The owner can accept the booking in his own calendar event copy
- [ ] `BOOK-18` The owner can decline the booking in hos own event calendar copy
- [ ] `BOOK-19` Cancelling the event frees the slot on the public side
- [ ] `BOOK-20` The schedule timezone is independent from the user's own
- [x] `BOOK-21` Two schedules can coexist without overlapping
- [x] `BOOK-22` A schedule with video conferencing generates a link on booking

## PUB — Public application (21)

- [x] `PUB-01` A public booking page loads without authentication
- [x] `PUB-02` The public calendar offers the days holding slots
- [x] `PUB-03` Selecting a day shows the available slots
- [x] `PUB-05` An unknown link shows "This booking link is not found"
- [x] `PUB-06` A deactivated link shows "This booking link is not available"
- [x] `PUB-07` The form requires a name
- [x] `PUB-08` The form requires an email
- [x] `PUB-09` An invalid email is refused
- [x] `PUB-10` Confirming a booking shows the success screen with the date
- [x] `PUB-11` Booking a slot taken in the meantime shows "no longer available"
- [x] `PUB-12` The cancellation link allows cancelling the booking
- [x] `PUB-13` After cancellation the slot becomes bookable again
- [x] `PUB-15` The public event preview opens with a valid JWT
- [x] `PUB-16` A missing token shows "Your link is invalid"
- [x] `PUB-17` An expired token shows "invalid or has expired"
- [x] `PUB-18` A deleted event shows "The event could not be found"
- [x] `PUB-19` The public preview allows answering the invitation
- [x] `PUB-20` An answer given publicly reaches the organizer
- [x] `PUB-23` The footer exposes the Privacy and Terms links
- [x] `PUB-25` The public preview of a recurring occurrence shows the right date
- [x] `PUB-26` No data of another user is reachable through a public token

## VISIO — Video conferencing (12)

- [x] `VISIO-01` "Add Visio conference" generates a link on the event
- [x] `VISIO-02` The generated link derives from `VIDEO_CONFERENCE_BASE_URL`
- [x] `VISIO-03` The link is persisted in CalDAV
- [x] `VISIO-04` Copying the meeting link shows "Meeting link copied"
- [x] `VISIO-05` Removing the video conference deletes the link from the event
- [x] `VISIO-06` The preview offers "Join the video conference"
- [x] `VISIO-07` The Join button opens the link in a new tab
- [x] `VISIO-08` Guests can see the video conference link
- [x] `VISIO-09` The "Please do not edit this section" marker is present in the description
- [x] `VISIO-10` Editing the event does not break the existing link
- [x] `VISIO-11` A video conference on a recurring event is shared by every occurrence
- [x] `VISIO-12` The link stays valid after a time change

## ALARM — Notifications and reminders (14)

- [x] `ALARM-01` The default notification is "No notification"
- [x] `ALARM-02` Choosing a reminder 10 minutes before writes a `VALARM`
- [x] `ALARM-03` Every offered duration translates into the right `TRIGGER`
- [x] `ALARM-04` The email reminder writes `ACTION:EMAIL`
- [x] `ALARM-06` Removing the notification deletes the `VALARM`
- [x] `ALARM-07` The preview spells the reminder out
- [x] `ALARM-08` A reminder on an all day event is accepted
- [x] `ALARM-09` A reminder on a recurring event applies to every occurrence
- [x] `ALARM-10` Changing the reminder of a single occurrence leaves the others alone
- [x] `ALARM-11` The reminder is kept through a time change
- [x] `ALARM-12` An email reminder actually triggers an SMTP delivery
- [x] `ALARM-13` The reminder goes to the right recipient
- [x] `ALARM-15` Deleting the event cancels the scheduled reminder
- [x] `ALARM-16` A reminder in the past is not replayed

## FB — Free / busy (14)

- [x] `FB-01` Adding a guest shows their availability
- [x] `FB-02` A guest busy on the slot is flagged "This person is busy"
- [ ] `FB-03` A free guest is flagged "User is free"
- [ ] `FB-04` The unknown status shows its dedicated icon and tooltip
- [ ] `FB-05` The loading status shows "Status is loading"
- [ ] `FB-06` A clash with one's own agenda shows "You have another event at this time"
- [x] `FB-07` Changing the time recomputes the availabilities
- [x] `FB-08` An event marked "Free" does not make the guest busy
- [x] `FB-09` An event marked "Busy" makes the guest busy
- [ ] `FB-10` A resource's availability is computed like a user's
- [x] `FB-11` A guest outside the domain shows the unknown status
- [x] `FB-12` Availability accounts for recurring occurrences
- [ ] `FB-13` The "Check availability" field searches both users and resources
- [x] `FB-14` Removing a guest removes their availability row

## TZ — Timezones (19)

- [x] `TZ-01` The default timezone of the form is the one from the settings
- [x] `TZ-02` Changing the timezone of an event shifts its display
- [x] `TZ-03` The chosen timezone is written in `DTSTART;TZID`
- [x] `TZ-04` The timezone search filters the list
- [x] `TZ-06` The grid axis shows the current UTC offset
- [x] `TZ-07` An event created in Paris displays correctly for a user in Tokyo
- [x] `TZ-08` An event created in Tokyo displays correctly for a user in Paris
- [x] `TZ-09` An all day event does not move from one timezone to another
- [x] `TZ-10` The spring DST change does not shift a daily recurring event
- [x] `TZ-11` The autumn DST change does not shift a weekly recurring event
- [x] `TZ-12` An event placed in the skipped spring hour is handled
- [x] `TZ-13` An event placed in the doubled autumn hour is handled
- [x] `TZ-14` Changing the timezone in the settings redraws the whole grid
- [x] `TZ-15` Automatic detection picks up the browser timezone
- [x] `TZ-16` The banner offers to switch when the detected timezone differs from the configured one
- [x] `TZ-17` Declining the switch keeps the configured timezone
- [x] `TZ-18` `ASK_FOR_TZ_UPDATE=false` hides the banner
- [x] `TZ-19` An invitation received from another timezone displays at local time
- [x] `TZ-20` A recurrence spanning three months crosses the DST change correctly

## DND — Drag, drop and resize (14)

- [x] `DND-01` Dragging an event changes its time
- [x] `DND-02` The new time is persisted in CalDAV
- [x] `DND-03` Dragging an event from one day to another changes its date
- [x] `DND-04` Resizing an event from the bottom lengthens it
- [ ] `DND-05` Resizing from the top moves the start time earlier
- [x] `DND-06` A zero duration is refused when resizing
- [x] `DND-07` Dragging a recurring event opens the scope dialog
- [x] `DND-08` Dragging a single occurrence creates an exception
- [x] `DND-11` Dragging a read only event is refused
- [x] `DND-12` Dragging updates the availability of the guests
- [x] `DND-13` The drag is rolled back when the server refuses the update
- [x] `DND-14` Dragging in the month view changes the date without touching the time
- [x] `DND-15` Dragging a range opens the prefilled creation form
- [x] `DND-16` A drag followed by a reload shows the same position

## DEEP — Deep links (10)

- [x] `DEEP-01` `/events/:uid` opens the event preview after login
- [x] `DEEP-02` `/events/:uid` on an unknown UID shows the dedicated error
- [x] `DEEP-03` `/events/:uid` goes through the SSO flow when no session exists
- [x] `DEEP-05` `/newEvent?attendee=a@x.com` opens the form with the guest prefilled
- [x] `DEEP-06` Several repeated `attendee` parameters are all prefilled
- [x] `DEEP-07` Comma separated `attendee` values are all prefilled
- [x] `DEEP-08` An invalid `attendee` is ignored with a message
- [x] `DEEP-09` The Create button tooltip names the prefilled guest
- [x] `DEEP-10` `/error` shows the generic error page
- [x] `DEEP-12` `/events/:uid` on a recurring occurrence opens the right occurrence

## PRINT — Printing (12)

- [x] `PRINT-01` The Print action opens the printable schedule dialog
- [x] `PRINT-02` The scale offers Day, Week and Month
- [x] `PRINT-03` The layout offers Grid and Schedule
- [x] `PRINT-04` The "This week" period prefills the dates
- [x] `PRINT-05` An end date before the start shows the dedicated error
- [x] `PRINT-06` A range too wide shows "too large to print"
- [x] `PRINT-07` Additional calendars can be added to the printout
- [x] `PRINT-08` A period without events shows "No events"
- [x] `PRINT-09` An untitled event is printed as "(No title)"
- [x] `PRINT-10` All day events are grouped under "All day"
- [x] `PRINT-11` A blocked pop-up shows the warning message
- [x] `PRINT-12` A loading failure shows "Could not load the calendar events"

## I18N — Internationalisation (14)

- [x] `I18N-01` Russian relabels the menubar and the sidebar
- [x] `I18N-02` Vietnamese relabels the menubar and the sidebar
- [x] `I18N-03` The month names of the grid follow the chosen language
- [x] `I18N-04` The day names of the grid follow the chosen language
- [x] `I18N-05` The first day of the week follows the locale
- [x] `I18N-06` The 24 hour format is honoured when configured
- [x] `I18N-07` The long date format of the form follows the locale
- [x] `I18N-08` Validation messages are translated
- [ ] `I18N-09` Network error messages are translated — they are not, or not always. With
  the interface in French, a failed call for calendar data raises a snackbar reading
  `Request failed with status code 500 Internal Server Error: REPORT http://api/dav/...`
  with an `OK` button: the raw text of the HTTP client, in English, naming an internal
  address. It is intermittent — the same scenario produced a translated banner five runs
  in a row before producing this one, and CI needed five runs to catch it — so two paths
  lead out of the same failure and only one of them uses the translations, which do exist
  (`error.unknown`, `error.retry`).
- [x] `I18N-10` The recurrence summary of the preview is translated
- [x] `I18N-11` The default calendar is named in the user's language
- [x] `I18N-12` `HIDE_LANGUAGE_SELECTOR` hides the language picker
- [x] `I18N-13` `LANG` sets the initial language before any user choice
- [x] `I18N-14` No raw translation key ever shows up in the interface

## A11Y — Accessibility and keyboard (8)

- [x] `A11Y-01` Every menubar button exposes an accessible name
- [x] `A11Y-02` The creation modal traps the focus
- [x] `A11Y-04` Tab walks through the form fields in visual order
- [x] `A11Y-07` Every form field has an associated label
- [x] `A11Y-08` Dropdowns are operable with the keyboard
- [x] `A11Y-09` Calendar checkboxes are operable with the keyboard
- [x] `A11Y-11` Error messages are announced to screen readers
- [x] `A11Y-14` The page title changes to reflect the current view

## RESP — Responsive, mobile and tablet (18)

- [x] `RESP-01` On a mobile viewport, the default view is the day view
- [x] `RESP-02` On a tablet viewport, the tablet menubar is used
- [x] `RESP-03` The sidebar is collapsed by default on mobile
- [x] `RESP-04` The toggle button shows and hides the sidebar
- [x] `RESP-05` The creation modal is fullscreen on mobile
- [ ] `RESP-06` The booking management modal is fullscreen on mobile
- [ ] `RESP-07` The Drive file picker is fullscreen on mobile
- [ ] `RESP-08` Mobile search opens its dedicated dialog
- [ ] `RESP-09` Swiping horizontally changes day
- [x] `RESP-10` Input fields use a font size that avoids the iOS zoom
- [x] `RESP-11` The event preview is readable without horizontal scrolling
- [ ] `RESP-12` The view picker stays reachable on a small screen
- [x] `RESP-13` The grid does not overflow horizontally at 320 px wide
- [x] `RESP-14` The mini calendar is hidden on mobile
- [ ] `RESP-15` The mobile search filter offers the same options as the desktop one
- [x] `RESP-16` Resizing from mobile to desktop switches the view back
- [ ] `RESP-17` Guest lists stay usable on a small screen
- [x] `RESP-18` The recurrence form stays usable on a small screen

## ROBUST — Robustness and large volumes (20)

- [x] `ROBUST-01` A backend 500 shows the error banner rather than a blank screen
- [ ] `ROBUST-02` A backend 401 restarts the SSO flow
- [x] `ROBUST-03` A network drop while saving shows an actionable error
- [ ] `ROBUST-04` The typed event is restored after a failed save
- [ ] `ROBUST-05` The automatic retry recovers from a transient error
- [x] `ROBUST-06` A slow backend (3 s) never shows an inconsistent state
- [x] `ROBUST-07` A week loaded with 200 events renders in under 5 seconds
- [ ] `ROBUST-08` A month view loaded with 500 events stays navigable
- [x] `ROBUST-09` The "show more" link of a month cell expands the hidden events
- [ ] `ROBUST-10` A calendar holding 2000 events loads without freezing
- [ ] `ROBUST-11` An event with a corrupted iCalendar is reported without breaking the grid
- [ ] `ROBUST-12` Several failing events are grouped in a single message
- [ ] `ROBUST-13` Reloading during a write does not lose the already acknowledged data
- [ ] `ROBUST-14` Two concurrent edits of the same event are arbitrated cleanly
- [x] `ROBUST-15` Browsing quickly between weeks does not fire duplicate requests
- [ ] `ROBUST-16` Closing the modal while saving does not create a duplicate
- [x] `ROBUST-17` A title with special characters and emojis is returned unchanged
- [x] `ROBUST-18` A description containing HTML is displayed escaped, never interpreted
- [x] `ROBUST-19` Opening a simple event fires no extra request ([#1364](https://github.com/linagora/twake-calendar-frontend/issues/1364))
- [x] `ROBUST-20` Opening an occurrence reads its rule once, as jCal ([#1364](https://github.com/linagora/twake-calendar-frontend/issues/1364))

## DRIVE — Attachments (10)

- [ ] `DRIVE-01` The attachments section is hidden when the feature is off
- [ ] `DRIVE-02` The Drive picker opens from the event form
- [ ] `DRIVE-03` A picked file shows up in the attachment list
- [ ] `DRIVE-04` The attachment is persisted in CalDAV
- [ ] `DRIVE-05` Removing an attachment deletes it from the event
- [ ] `DRIVE-06` The event preview lists the attachments
- [ ] `DRIVE-07` A guest can see the attachments of the event
- [ ] `DRIVE-08` A Drive loading failure shows the dedicated message
- [ ] `DRIVE-09` A picker opening failure shows the dedicated message
- [ ] `DRIVE-10` Attachments survive an edit of the event

## SEC — Security and privacy (8)

- [x] `SEC-01` A user cannot read another's calendar without a share
- [x] `SEC-02` A CalDAV request carrying another user's token is refused
- [x] `SEC-04` The access token is never written into a URL
- [x] `SEC-06` A description containing a script is never executed
- [x] `SEC-07` A title containing a script is never executed
- [x] `SEC-08` An external link in a description opens with `rel=noopener`
- [x] `SEC-09` `DISABLE_PUBLIC_VISIBILITY` removes the public visibility option
- [x] `SEC-12` A websocket ticket cannot be replayed by another session

---

## Progress

| Batch | Written | Total |
| --- | --- | --- |
| Past incidents | 45 | 49 |
| Essential | 189 | 194 |
| Bonus | 235 | 288 |
| **Total** | **469** | **531** |

The essential batch is complete but for five scenarios. `SYNC-08` and `SYNC-09` need the
websocket cut and restored under the application; `SEARCH-09`, `SET-07` and `SET-13` are simply
not written.

`AttendeesFullTest` shows the multi user pattern, `RecurrenceTest` the recurrence one, and
`PastRecurrenceTest` how to back a UI assertion with a CalDAV one.


