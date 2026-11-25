# Decisions

Decisions taken on @calendar/common, oldest first. Append only: a decision that changes gets a new entry that replaces the old one and cites it. Entry format: the `twake-decisions` skill of [linagora/twake-guidelines](https://github.com/linagora/twake-guidelines/blob/main/skills/twake-decisions/SKILL.md).

Categories: UX, UI, Product, Architecture, Infra, Tech.

## 2026-11-24, [UX] A recurring search result previews a loaded occurrence

- Decision: when the occurrences of a series are already in the store, so that the series is not stored under its plain uid, clicking its search result opens the preview of the loaded occurrence that starts with the result, or else of the earliest loaded one. The `getEvent` reducer keeps storing nothing under the plain uid of such a series.
- Decided by: proposed in the fix of [#2204](https://github.com/linagora/twake-calendar-frontend/issues/2204), one of the two fixes suggested by Eriikah in the issue; open to review.
- Why: the fix stays in the search results and leaves the store as the grid reads it since #492, where an entry under the plain uid next to the occurrences could be shown as one more event; the grid already previews occurrences by their key.
- Scope: `common`, search results on desktop and mobile.
