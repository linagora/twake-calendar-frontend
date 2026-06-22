# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)

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
