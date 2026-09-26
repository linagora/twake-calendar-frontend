# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)

## [1.1.0]

### Added

- Attached TDrive files to events
- Added support for Team Calendars
- Toggle debug mode at runtime with CTRL + SHIFT + ALT + D, without redeploying `.env.js`
- Disclose the delegate who scheduled an event on the organizer's behalf (`SENT-BY`)

### Changed

- Automatic timezone detection is now on by default, remembered server side through the
  `core.datetime` `autoDetect` setting, and locally on deployments that do not serve it yet
- Fixed rich text formatting (e.g., bold, italic) in event preview descriptions
- Fixed the participation status of a single occurrence of a recurring event, which the DAV
  read could leave unchanged
- Editing all the events of a series keeps its customized and deleted occurrences, moves them
  along when the time of day changes, and writes the series once
- Expanded booking links to include attendee, location, resource, alert, free/busy, and visibility options

## [1.0.0] - Unreleased

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
