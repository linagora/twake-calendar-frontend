# Changelog
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
