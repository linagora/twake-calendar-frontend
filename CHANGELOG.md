# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)

## [Unreleased]

### Added

- The form of a new event as the cozy-stack intent `CREATE io.cozy.calendar.events` on `/intents`:
  Twake Chat opens it in a room, with the members of the room as attendees, and gets the event saved
- #1826 Deleting an event shows a notification with an undo button; the deletion is sent after 3 seconds unless undone
- #2017 Toast notification when the participation status of an event is updated
- #2048 "Enable keyboard shortcuts" switch in Settings → Calendar and events (desktop only), so the single key shortcuts can be turned off. The choice is remembered by the browser, and the shortcuts stay on by default

### Changed

- #2026 The RSVP page shows the event in the attendee's time zone, the browser one by default, and lets the attendee pick another
- #1931 An end time before the start keeps the last valid duration instead of moving the end or creating a multi-day event
- #1930 The Drive picker signs in without a Drive session and reports a failure to open after 30 s instead of loading forever
- #1941 Events and series in a custom time zone (such as "Customized Time Zone" from Outlook) are read and saved with their stored VTIMEZONE, keeping their zone, overrides and recurrence ends instead of being shifted
- #1949 #1978 #2001 #2033 Editing all the events of a series keeps `BYHOUR`, `UNTIL`, the overrides, `EXDATE`s and `RDATE`s consistent when the time of day changes
- #1948 A recurring event whose time zone is set on edit is saved with a UTC `UNTIL`
- #1945 Editing an occurrence in the hour repeated at the end of summer time edits the right occurrence
- #1938 #1939 #1977 #2034 Editing one occurrence of a series no longer overwrites the override of another occurrence or loses its own values
- #1950 Answering "All the events" works for a series whose time zone is unknown
- #1943 A new organizer listed twice among the attendees is written once, with their answer kept
- Removing the footer of a description no longer leaves it in the form or loses a note written after it
- #1937 Saving an unchanged event no longer moves it by one hour, nor resets the attendees' answers, in zones where browser and application time zone data disagree (e.g. Africa/Casablanca)
- #1999 #2000 An event without an end, or in a repeated hour, is read and compared in its own zone, so an unchanged save no longer invites everyone again
- Opening the edit form of a simple event shows it in its stored time zone instead of the browser one
- #1993 An event whose VTIMEZONE cannot be expanded can still be opened
- #2015 The forms opened from an event link are shown, centred
- #1981 #1980 #1983 #1984 #1995 Events with an `RRULE` without `FREQ`, an unreadable start, `UNTIL` or `COUNT` are still shown and can be opened, without "Invalid Date" or made-up ends
- #1982 #2037 The printed schedule puts events on the right days, including on 25-hour days
- #2046 Plain-text descriptions are shown as typed in the preview, including text between angle brackets
- #2044 Opening a series whose answered occurrence is stored before its master reads the rule of the series
- #2072 The `REPEAT`, `DURATION`, `ATTACH` and `X-` properties of an alarm are kept when the event is saved
- #2047 The mini calendar selects the day of the navigated month after Next month
- #2045 The name and answer class of an event chip stay current after an answer, a move or a change of calendar
- #1805 Fixed the double draggable modal
- Updated twake-mui to fix the background

### Security

- Secrets and email addresses are better scrubbed from Sentry reports: credentials in percent-encoded nested URLs and parameter names, non-ASCII and percent-encoded addresses, with no loss of unrelated parameters such as `status-code`
- #1940 #1944 Prevented ReDoS in the email scrubbing of Sentry reports and in attendee address validation (reachable through the `/newEvent?attendee=` deep link)
- #1979 The `data-*` and `aria-*` attributes of event descriptions are dropped
- #1994 Links whose scheme contains a digit are refused in event descriptions

## [1.4.0] - 2026-11-04

### Upgrade instructions

- `TDRIVE_INTENT_URL` is removed. Tdrive is now found on the user's platform, whose URL comes from `workplaceFqdn` in `SSO_SCOPE` or from `WORKPLACE_FQDN_FALLBACK`. Deployments with `TDRIVE_ENABLED` must set one of the two.

### Added

- The Twake bar replaces the top bar of the calendar, except in an iframe. A crash of the bar no longer takes the calendar down with it
- #1827 Creating or opening an event in the future navigates to it
- #1833 Actions can be triggered with keyboard shortcuts
- #1831 Share option in the calendar menu
- #1834 More information in the notification setting
- #1829 Improved display of the search results
- Search results are announced to screen readers, with their count
- A "Skip to content" link, a level-1 heading and landmarks on every page, and a page title per screen

### Changed

- The Tdrive picker is offered when the user's platform is known and `TDRIVE_ENABLED` is set, and stays signed in as the id token expires
- Update of the edit dialog style
- Secondary buttons and chips use the grey of the Twake design library
- #1835 Dates are written in a single order in English
- #1924 Wording of the unknown availability of a guest or resource: "Availability couldn't be checked"
- #1830 Period added to the no event caption
- #1828 Checkboxes keep a visible color when the calendar color lacks contrast
- #1758 Fixed searching for a participant with a space in the name
- #1764 Fixed a dragged or resized occurrence staying where it was dropped when its dialog is cancelled
- #1763 Fixed the title of a two-month period on phones
- #1760 Fixed the weekday proposed for an all-day event west of UTC, and the day of an all-day search result
- #1773 Fixed copying in the embed
- #1807 Fixed the embed layout and height under the Twake bar
- Fixed the bottom of the calendar grid being cut off under the menubar
- #1816 Fixed the More options button of a calendar missing on phones
- #1836 Opening a canceled event from its deep link now tells it was canceled
- #1777 An invalid Hex value in the color picker is refused with an error
- #1776 Fixed the time zone offset of the booking page after a DST change
- #1806 Fixed booking links failing with calendar colors of three digits
- #1821 The user is told when the visio room cannot be created
- #1819 Fixed the Tdrive picker error alert that could not be dismissed
- #1809 Fixed the contact card on 320 px wide screens
- #1844 #1884 #1840 #1883 #1881 Fixed series edits and answers with Windows or unknown time zones: deleted occurrences coming back, orphaned overrides, missing time zone definitions
- #1882 Fixed an edit of one occurrence adding an orphan override instead of replacing the stored one
- #1898 #1899 Editing all the events keeps the `UNTIL` date-time and the recurrence rule parts the form does not model
- #1908 #1905 #1902 Saving without changes no longer moves the event or resets the answers of the attendees
- #1904 #1903 #1907 Fixed resources, attendees and the delegate sender being mismatched on save
- #1886 Fixed answering a single occurrence when the organizer address is padded
- Fixed an answer to a whole series refused by the server being reported as saved
- #1885 #1906 Fixed saving and editing events with a time zone the browser does not know
- #1910 #1912 #1911 Fixed the description of an event being altered on save by separators or by an attachment without file name
- #1843 Fixed a crash of the event preview on an unreadable end
- #1842 Alarms without trigger or action are ignored
- #1841 Fixed a crash on descriptions with an attribute on an end tag
- #1866 #1865 Printing the schedule skips events with an unreadable start and no longer loses events after a DST change
- #1863 #1864 Fixed a blank page on `/#/` deep links starting with `//`
- #1929 Fixed a blank page on `/callback` without a pending sign-in
- #1862 Fixed a moved occurrence displayed twice after a reload
- #1875 #1876 #1877 Malformed push messages no longer drop the whole notification
- #1761 #1762 #1765 #1775 #1784 #1785 #1786 #1787 #1788 #1789 #1792 #1793 Improved accessibility: names of dialogs, fields, buttons, events, participants and color swatches, keyboard selection of calendar colors, labels of the booking form, language names read in their own language

### Security

- #1867 Only valid colors of a calendar are written into the printed schedule

## [1.3.4] - 2026-10-22

### Upgrade instructions

- Set `FRAME_ANCESTORS` to the origins allowed to frame the application. It is required for the embed routes (`/embed/...`). When unset, the Docker images now send `frame-ancestors 'self'`, so no other page can frame the application.
- Remove `TWAKE_SPACE_ORIGIN` from `.env.js`. TwakeSpace is now identified from its greeting, and `FRAME_ANCESTORS` is the only setting that says who may frame the application.
- Set `HIDE_THEME_SELECTOR` to hide the new theme selector of the settings, for deployments where Twake Workplace common settings own the theme.
- The theme is stored in the `core.theme` user setting (`light`, `dark` or `auto`).

### Added

- Spanish, German and Italian are offered as interface languages
- Theme selector in the settings, following the `core.theme` user setting; `auto`, or no preference, follows the system
- Team calendars can be embedded in TwakeSpace: shown alone on an embed route, signed in silently, with dialogs drawn on the overlay of TwakeSpace, history left to TwakeSpace, and the month view with custom wording
- Embedded team calendar opens an event from `/embed/calendars/<id>/events/<uid>`, keeps the events of a space on its team calendar, and reports its upcoming events to TwakeSpace
- Inside TwakeSpace, the join button of an event opens the video meeting in the floating call window of TwakeSpace
- The Tdrive picker is offered outside an iframe, `TDRIVE_ENABLED` and `TDRIVE_INTENT_URL` alone deciding
- #1570 The navigation buttons of the menubar are named after the step they take (previous or next day, week or month)
- #1572 The booking confirmation page shows the meeting in the visitor's time zone, with a time zone picker
- #1637 A new time proposal already past is refused with a message
- #1635 A participant added twice is refused with an explanation
- The calendar adopts the twake-mui 13 look, with the Twake word of the logo in white on the dark scheme

### Changed

- Sign-in goes through `@linagora/twake-oidc`
- #1664 The week starts on Monday in English
- #1581 A weekly series on chosen weekdays starts on the first selected day
- #1668 Dragging a series with "All the events" moves the weekdays of its rule
- #1638 The personal settings and New time dialogs show the event in the user's time zone
- #1633 The booking success dialog shows the slot in the selected time zone
- #1657 The event preview describes the recurrence as one sentence
- #1634 The repeat summary of the collapsed event form reads as a sentence
- #1468 The menubar title reflects the displayed period
- #1730 The error snackbar stays until dismissed, and the error page keeps its message
- #1705 A failed request shows a translated message instead of the raw HTTP error
- #1545 Team calendar events show the answer of their organizer in the grid
- #1673 Mobile search results show the month, year and end of each result
- #1608 The booking link row actions stay visible on touch screens

### Fixed

- #1459 Event search sends the keyword in the field, not the previous one
- #1461 The schedule view lists multi-day all-day events under each of their days
- #1465 The events of a calendar created in the current session are shown
- #1466 Invalid attendee addresses in a `/newEvent` deep link are ignored
- #1472 The appointment schedule switch label matches its state
- #1476 The modify dialog shows "My calendar" instead of "#default"
- #1475 Propose a new time displays validation and send errors
- #1473 The booking page preselects today in the selected time zone
- #1464 Opening `/events/<unknown uid>` shows a translated "event not found" error
- #1485 The error page is shown instead of a blank one when the SSO cannot be reached
- #1489 The event preview does not move bookings out of a resource calendar
- #1492 #1500 The booking confirmation formats the date for the chosen language
- #1493 Escape closing the time dropdown no longer asks to discard the event
- #1491 #1596 #1511 #1514 All-day events keep the right days in the event form preview, when ticking All day and when unticking it late in the evening
- #1503 #1573 The remove dialog and the "Edit in ..." shortcut show the displayed name of a default calendar
- #1515 A spaces-only event title shows as Untitled
- #1526 Search results show the last day of all-day events
- #1523 Import and shared calendar network errors show the translated fallback
- #1513 Read-only team calendar members are not offered Edit / Delete
- #1505 Reopening the search Filters keeps the Organizers chosen in them
- #1534 The Access tab lists a newly granted user without a reload
- #1533 The ORGANIZER parameters stamped by the server are kept when saving an event, which fixes a 403
- #1524 Attendee email addresses are compared case-insensitively
- #1501 Cancelling the custom colour picker keeps the current colour
- #1547 #1562 Drag and drop, resize and personal event settings keep the time zone of the event
- #1549 #1550 #1557 Safari no longer saves event dates in 2010 or disables every day of the booking page
- #1553 The mobile Import tab no longer crashes
- #1580 Tabbing out of a time field with its list open puts the last valid time back
- #1582 Booking links are fetched once the session is established
- #1618 Date pickers grey out the days outside the allowed range
- #1600 The attendee contact card stays on screen on mobile
- #1602 #1630 #1719 The mobile menubar title no longer covers the Search button, stays centred and readable on 320px phones
- #1604 #1617 The mobile search Clear button empties the field and stays on one line
- #1616 The recurrence Until date field grows with the date it shows
- #1615 Month view shows "+N" overflow links on phones
- #1611 Email attendees closes the More menu of the event preview
- #1606 The mobile time slot sheet closes once a duration is picked
- #1613 Regular hours time fields are no longer clipped on phones
- #1603 #1636 Mobile people and resource search shows "No results" when nothing matches, and drops it once the field is cleared
- #1455 #1651 #1667 All-day events keep their end date across the fall clock change and their day when the time zone is behind UTC
- #1640 The owner caption of resource calendars is hidden in the event preview
- #1652 The New time dialog shows the last day of an all-day event as End Date
- #1653 The event preview wraps a long unbroken title word
- #1669 An embed route leaves the calendar selection of the full application untouched
- #1671 Event links of team calendars open
- Event links open their preview even when the grid shows no event
- #1700 The recurrence rule is kept after answering a single occurrence
- #1703 The proposed weekly day moves along with the start date
- #1716 Settings stay open when a change cannot be saved
- #1684 #1712 An event whose end precedes its start shows only its start
- #1688 An unknown configured time zone no longer locks the user out of the app
- Free/busy conflicts exclude the edited event on the server side
- #1729 A write delegate can edit an event without organizer
- #1728 The desktop search bar searches the team calendars
- #1658 The embedded team calendar leaves the Create button to the floating one on a phone
- #1735 The theme is picked in a bottom sheet on a phone
- #1734 The mini calendar selects the day the grid shows after a month change
- #1522 #1609 #1574 #1579 #1672 #1685 #1704 #1715 #1717 #1714 #1713 #1736 #1597 #1471 Improved accessible names and roles across the date pickers, event form, sidebar, search filters, contact card, copy buttons and RSVP answers
- #1696 #1706 #1583 #1584 #1585 #1586 #1504 #1543 Corrected Italian, Spanish, Russian and Vietnamese wording
- Untranslated labels and errors are now translated, including the remove calendar label and the time zone search field

### Security

- #1731 The Docker images refuse to be framed by other pages when `FRAME_ANCESTORS` is unset, and send `X-Content-Type-Options: nosniff

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
