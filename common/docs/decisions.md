# Decisions

Decisions taken on @calendar/common, oldest first. Append only: a decision that changes gets a new entry that replaces the old one and cites it. Entry format: the `twake-decisions` skill of [linagora/twake-guidelines](https://github.com/linagora/twake-guidelines/blob/main/skills/twake-decisions/SKILL.md).

Categories: UX, UI, Product, Architecture, Infra, Tech.

## 2026-11-24, [UX] A recurring search result previews a loaded occurrence

- Decision: when the occurrences of a series are already in the store, so that the series is not stored under its plain uid, clicking its search result opens the preview of the loaded occurrence that starts with the result, or else of the earliest loaded one. The `getEvent` reducer keeps storing nothing under the plain uid of such a series.
- Decided by: proposed in the fix of [#2204](https://github.com/linagora/twake-calendar-frontend/issues/2204), one of the two fixes suggested by Eriikah in the issue; open to review.
- Why: the fix stays in the search results and leaves the store as the grid reads it since #492, where an entry under the plain uid next to the occurrences could be shown as one more event; the grid already previews occurrences by their key.
- Scope: `common`, search results on desktop and mobile.

## 2026-11-25, [UI] The Italian options menus put the name after a colon

- Decision: the Italian name of the options menu of a calendar, booking link or event is "Opzioni: %{name}", like the Russian one, instead of "Opzioni di %{name}".
- Decided by: Benoit Tellier, [#2215](https://github.com/linagora/twake-calendar-frontend/issues/2215)
- Why: the name is free text and often starts with an article ("Il mio calendario", the default calendar), which "di" would have to contract with ("del mio calendario"); a colon reads well whatever the name.
- Scope: `common/src/locales/it.json`.

## 2026-11-25, [Tech] An event whose UID is `__proto__` is rejected when it is read

- Decision: `parseCalendarEvent` throws on `UID:__proto__`, so the readers skip and report that event like any unreadable one. The stores keep their plain objects keyed by UID; the other events of the load are stored as before.
- Decided by: claude, applying the short-term remediation of the twake-qa security review of 2026-11-25 (SEV-1, [#2214](https://github.com/linagora/twake-calendar-frontend/issues/2214)); to be confirmed in the review of the pull request.
- Why: Immer turns a write under `__proto__` into a prototype change and throws, which dropped every event of the load and failed every later one. Anyone could cause this with one invitation. Every server read goes through `parseCalendarEvent`, so one check covers the 7 writes keyed by UID. Moving every `events` map to `Object.create(null)` would mean changing each place that creates one, and a missed one would bring the bug back. Such an event cannot be shown in the web UI: it has to be removed through CalDAV.
- Scope: `common/src/features/Events/utils/parseCalendarEvent.ts`.
