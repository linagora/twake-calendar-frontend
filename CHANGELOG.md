# Changelog

## 2026-11-12 (9658c9f..83d6999)

### Added

- Update twake-mui to fix background
- Added deletion snackbar and undo button ([#1850](https://github.com/linagora/twake-calendar-frontend/pull/1850))
- Added toast for event participatiion update ([#2018](https://github.com/linagora/twake-calendar-frontend/pull/2018))

### Changed

- Migrate the shared API client to Ky 2
- Keep the grouped dependency update compatible
- Make browser login and Access tab checks tolerate delayed responses
- Upgrade React and React DOM to 19 together
- Type the synchronous attachment renderer for React 19
- Migrate the calendar grid and plugins to FullCalendar 7
- Use the inferred FullCalendar event input type
- Find the FullCalendar time-grid scroll container
- Let FullCalendar 7 observe grid size changes
- Restore the time grid borders after the FullCalendar upgrade
- Keep the refused drag clear of the save notification

### Fixed

- Keep the last valid duration after an end time before the start (#1931) ([#1935](https://github.com/linagora/twake-calendar-frontend/pull/1935))
- Sign the Drive picker in without a Drive session ([#1930](https://github.com/linagora/twake-calendar-frontend/pull/1930))
- Mask credentials in percent-encoded nested URLs ([#1947](https://github.com/linagora/twake-calendar-frontend/pull/1947))
- Keep hyphenated parameter names like status-code unmasked
- Mask parameters whose name is percent-encoded
- Read an unknown series zone as UTC when answering all the events ([#1950](https://github.com/linagora/twake-calendar-frontend/pull/1950))
- Move BYHOUR by the series shift even when it lists the new hour ([#1949](https://github.com/linagora/twake-calendar-frontend/pull/1949))
- Write a UTC UNTIL when a floating series gets a TZID ([#1948](https://github.com/linagora/twake-calendar-frontend/pull/1948))
- Mask email addresses with non-ASCII characters ([#1946](https://github.com/linagora/twake-calendar-frontend/pull/1946))
- Keep the edited instant in the RECURRENCE-ID of a new override ([#1945](https://github.com/linagora/twake-calendar-frontend/pull/1945))
- Validate addresses in linear time ([#1944](https://github.com/linagora/twake-calendar-frontend/pull/1944))
- Write a new organizer listed twice once ([#1943](https://github.com/linagora/twake-calendar-frontend/pull/1943))
- Remove the footer in one pass when separators follow it
- Read and write a custom zone with its stored VTIMEZONE ([#1941](https://github.com/linagora/twake-calendar-frontend/pull/1941))
- Move the overrides of a custom zone series with its VTIMEZONE ([#1941](https://github.com/linagora/twake-calendar-frontend/pull/1941))
- Keep UTC series and recurrence ends right in a custom zone ([#1941](https://github.com/linagora/twake-calendar-frontend/pull/1941))
- Scrub email addresses in linear time ([#1940](https://github.com/linagora/twake-calendar-frontend/pull/1940))
- Edit the override read in the event zone among same wall-clock RECURRENCE-IDs ([#1939](https://github.com/linagora/twake-calendar-frontend/pull/1939))
- Read a floating stored RECURRENCE-ID in the series zone ([#1938](https://github.com/linagora/twake-calendar-frontend/pull/1938))
- Read the form's wall clock with moment-timezone ([#1937](https://github.com/linagora/twake-calendar-frontend/pull/1937))
- Drop the data-* and aria-* attributes of a description ([#1979](https://github.com/linagora/twake-calendar-frontend/pull/1979))
- Show no text for a start the preview cannot read ([#1983](https://github.com/linagora/twake-calendar-frontend/pull/1983))
- Read an event whose RRULE has no FREQ without a repetition ([#1981](https://github.com/linagora/twake-calendar-frontend/pull/1981))
- Give no made-up end to an event whose start cannot be read ([#1980](https://github.com/linagora/twake-calendar-frontend/pull/1980))
- Leave out an UNTIL the preview cannot read ([#1984](https://github.com/linagora/twake-calendar-frontend/pull/1984))
- Compare the instants of the events, not their wall clocks ([#1982](https://github.com/linagora/twake-calendar-frontend/pull/1982))
- Read the day of a dragged series in its stored VTIMEZONE ([#1941](https://github.com/linagora/twake-calendar-frontend/pull/1941))
- Edit the override of the instant among VTIMEZONE-only TZIDs ([#1977](https://github.com/linagora/twake-calendar-frontend/pull/1977))
- Move a DATE-TIME UNTIL with the time of day of a series ([#1978](https://github.com/linagora/twake-calendar-frontend/pull/1978))
- Read an event whose VTIMEZONE ical.js cannot expand ([#1993](https://github.com/linagora/twake-calendar-frontend/pull/1993))
- Refuse a link scheme holding a digit in a description ([#1994](https://github.com/linagora/twake-calendar-frontend/pull/1994))
- Read an RRULE count as a positive integer ([#1995](https://github.com/linagora/twake-calendar-frontend/pull/1995))
- Compute a missing end from the start read in the event zone ([#1999](https://github.com/linagora/twake-calendar-frontend/pull/1999))
- Compare a save with the minute the form shows ([#2000](https://github.com/linagora/twake-calendar-frontend/pull/2000))
- Shift an override of another zone in the zone of the series ([#2001](https://github.com/linagora/twake-calendar-frontend/pull/2001))
- Mask an address whose domain is percent-encoded UTF-8
- Keep a user paragraph paired before a footer without notice
- Keep the zone and the overrides of a custom zone series on save ([#1941](https://github.com/linagora/twake-calendar-frontend/pull/1941))
- Open the edit form of a simple event in its stored zone
- Fix double draggable modal bug ([#2021](https://github.com/linagora/twake-calendar-frontend/pull/2021))
- Show the forms opened from an event link ([#2015](https://github.com/linagora/twake-calendar-frontend/pull/2015))
- Resolve UI regression of calendar grid
- Fix layer order of event chip and booking link chip
- Show the RSVP page in the attendee's time zone ([#2026](https://github.com/linagora/twake-calendar-frontend/pull/2026))
- Prefer an override with a definite instant among same wall-clock RECURRENCE-IDs (#2034) ([#2035](https://github.com/linagora/twake-calendar-frontend/pull/2035))
- Re-anchor month-grid and all-day day ends on local midnight ([#2037](https://github.com/linagora/twake-calendar-frontend/pull/2037))
- Read the series day of a custom zone in its VTIMEZONE (#2033) ([#2036](https://github.com/linagora/twake-calendar-frontend/pull/2036))
- Let users turn off the single key shortcuts (#2048) ([#2051](https://github.com/linagora/twake-calendar-frontend/pull/2051))
- Select the navigated month's day in the mini calendar after Next month (#2047) ([#2052](https://github.com/linagora/twake-calendar-frontend/pull/2052))
- Show plain-text descriptions as typed in the preview (#2046) ([#2053](https://github.com/linagora/twake-calendar-frontend/pull/2053))
- Keep the event chip name and answer class current (#2045) ([#2054](https://github.com/linagora/twake-calendar-frontend/pull/2054))
- Read the rule of a series from its master on open (#2044) ([#2055](https://github.com/linagora/twake-calendar-frontend/pull/2055))

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)

## [1.3.3] - 2026-09-29

### Added

- #1432 Free/busy indicator on the resource chips of the event form
- #1415 Localized long date format in the date pickers of the event form
- #1410 Plural forms in counted labels

### Changed

- #1430 Editing all the events of a series keeps its customized and deleted occurrences, moves them
  along when the time of day changes, and writes the series once
- #1412 Month view loads the events of the adjacent-month days displayed in its grid
- #1422 An event created while another period is displayed shows up once navigated to
- #1414 The recurrence interval is validated instead of being coerced to 1
- #1424 Booking links report slots ending before they start
- #1426 Booking links show the owner as busy by default
- #1433 Failed writes are no longer silently retried
- #1436 A masked private event of a delegated calendar is never written back
- An unreadable event is skipped instead of failing its whole calendar
- #1445 `/#/xxx` URLs are rewritten into `/xxx`
- #1428 `<html lang>` is kept in sync with the UI language
- #1434 Fixed French secret URL description wording
- #1438 Fixed a dialog wording mismatch

### Security

- Session tokens are kept in memory, out of web storage, and logging out ends the session in every tab
- The Calendar access token is only sent to the Calendar backend
- Event UIDs are encoded in the DAV paths built from them
- Only hexadecimal calendar colors are accepted, and server-supplied colors are passed through `style`
- Links of event descriptions always open in a new tab; their `target` and `rel` are not kept
- Attendee addresses are validated before composing a mail to them
- The printed schedule is rendered in a sandboxed iframe
- The Lottie player runtime is served locally
- Redux DevTools are only enabled when `DEBUG` is set
- Secrets and personal data are scrubbed from Sentry reports, event contents are no longer logged,
  and credentials are masked in the nginx access log

## [1.3.2] - 2026-09-25

### Added

- Calendar administrators can manage the public visibility of a calendar
- Team calendar administrators can manage its rights

### Changed

- A delegated calendar is read and watched through the sharee's instance
- #1407 The create event button of the day view creates the event on the displayed day

## [1.3.1] - 2026-09-24

### Changed

- #1378 Automatic timezone detection is now on by default, remembered server side through the
  `core.datetime` `autoDetect` setting, and locally on deployments that do not serve it yet
- #1403 Fixed the boot-time user configuration fetch reverting a picked timezone
- #1377 Links in event descriptions are detected in advance
- #1237 Attachment chips follow the design
- #1400 Improved responsive dialogs

## [1.3.0] - 2026-09-24

### Added

- #1369 Toggle debug mode at runtime with CTRL + SHIFT + ALT + D, without redeploying `.env.js`
- #1373 Disclose the delegate who scheduled an event on the organizer's behalf (`SENT-BY`)
- #1381 Let the side service create the Meet room (`MEET_BACKEND_INTEGRATION`)
- #1386 Toast notification on successful import
- #1371 The Import tab is offered on any calendar the user may write into

### Changed

- #1380 The timezone alert is now a modal
- #1375 Calendar objects are read as jCal, never as ICS, which fixes the participation status of a
  single occurrence of a recurring event that the DAV read could leave unchanged
- #1364 An event is only read on open when the grid lacks its recurrence rule
- #1396 The current user organizes the events created in a team calendar
- #1388 #1398 Grid selection, drag and drop and resize keep their time when the grid timezone differs from the browser one
- #1384 An expanded dialog no longer hides the menubar controls
- #1366 The application no longer gets stuck on `/error` when the calendar list fails to load

## [1.2.0] - 2026-09-15

### Added

- #1298 Automatic link detection in event previews
- #1113 Private event caption in the access tab
- #1297 Toast when a booking link is enabled or disabled
- #1286 Booking link placeholder
- #1348 Warning when adding a duplicated participant
- #1304 Action result alerts in the public event page
- End-to-end test suite

### Changed

- #238 Updating the participation status of a recurring event applies to future instances
- #1303 The booking color takes priority over the calendar color
- #1100 An attendee's personal alarm is kept when the organizer updates the global alarm
- #1334 Fixed proposing a new time
- #1340 Fixed saving an event's personal settings
- #1291 Fixed the modal position when its anchor changes
- #1360 Fixed the month view displaying a wrong date
- #1309 Updated twake-mui
- #409 Removed the loading animation loop of the application
- #1332 Removed the loading animation of the chat icon

### Security

- Prevented ReDoS in duration parsing, URL detection and visio stripping from event descriptions

## [1.1.0]

### Added

- #1164 #1235 #1240 Attached TDrive files to events
- #393 Added support for Team Calendars
- #1168 #1181 Expanded booking links to include attendee, location, resource, alert, free/busy, and visibility options
- #1300 Confirmation before discarding unsaved changes of the event modal
- #624 Unknown free/busy status icon and tooltip
- #1070 `ENABLE_REFRESH_BUTTON` runtime variable to display a refresh button
- #1126 Logotype

### Changed

- #1257 Fixed rich text formatting (e.g., bold, italic) in event preview descriptions
- #1277 RRULEs with `COUNT=0` can no longer be created
- #1251 Fixed resource administrator access handling
- #1265 `workplaceFQDN` falls back when the OIDC context is not set
- #1329 Invisible video descriptions are stripped from the grid preview
- #1280 #1296 Improved mobile layout of full screen modals and booking management

## [1.0.2] - 2026-08-12

### Added

- #1218 Button to toggle the active status of a booking link
- #1163 TDrive iframe loading

### Changed

- #1221 Event modals are placed dynamically
- #1230 Fixed opening an event from search results and keyword search
- #1231 Fixed attendees preview
- #1238 Fixed event preview header actions

## [1.0.1] - 2026-07-28

### Added

- #1086 #1220 #1161 Contact card of attendees, shown on hover, with a button to open a chat
- #1172 Event status icon in the event preview
- #1067 Calendar owner name in the calendar modal of delegated calendars
- #1135 Backend color support
- #1196 Printing the schedule
- #266 Draggable responsive modals
- #1167 Source maps pushed to Sentry

### Changed

- #1179 #1199 Improved the public booking page
- #1217 `SEQUENCE` is incremented when deleting recurring occurrences via `EXDATE`
- #1201 Alarm triggers use the RFC 5545 duration format
- #1205 Videoconference jCal property uses the `uri` type
- #1154 #1155 #1156 #1170 #1171 #1177 #1180 #1186 #1189 Various UI fixes on bookings, sidebar, mini calendar and event creation modal

## [1.0.0] - 2026-07-17

First release of the Twake Calendar frontend, a Single Page Application allowing users to
interact with their calendar. It is a drop-in replacement of `esn-frontend-calendar` and
interacts with `esn-sabre` (CalDAV + CardDAV) and the Twake Calendar side service.

### Added

- Private calendar application for authenticated users
- Public calendar application for public event previews and shared links
- Calendar views (day, week, month) with event creation, edition and deletion
- Shared and delegated calendars
- Event search, including on delegated calendars
- Multi-language support
- Configurable application grid and runtime configuration via static JS files
- Personal settings
- Calendar delegation and right management
- Availability search bar
