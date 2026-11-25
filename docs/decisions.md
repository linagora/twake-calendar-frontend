# Decisions

Decisions taken on twake-calendar-frontend, all its workspaces included, oldest first. Append only: a decision that changes gets a new entry that replaces the old one and cites it. Entry format: the `twake-decisions` skill of [linagora/twake-guidelines](https://github.com/linagora/twake-guidelines/blob/main/skills/twake-decisions/SKILL.md).

Categories: UX, UI, Product, Architecture, Infra, Tech.

## 2026-11-23, [Architecture] One decisions log at the repo root

- Decision: the repository keeps a single `docs/decisions.md` at its root for every package, and an entry names the packages it covers in its Scope line; packages keep no log of their own.
- Decided by: Crash-- (CTO), following [JF-Cozy's review of linagora/twake-ui#262](https://github.com/linagora/twake-ui/pull/262#discussion_r4663460487)
- Why: a decision often spans packages, and the `twake-decisions` skill looks up `docs/decisions.md` at the root.
- Scope: the whole repository, every package.

## 2026-11-23, [Architecture] One decisions log per package

- Decision: Replaces the decision of 2026-11-23, "One decisions log at the repo root". Each package keeps its own `docs/decisions.md` and the repo root has none; a decision that touches several packages goes in the log of the main one, the others named in its Scope line.
- Decided by: Crash-- (CTO), [review comment on linagora/twake-ui#262](https://github.com/linagora/twake-ui/pull/262#discussion_r4664895803)
- Why: one log per package keeps merge conflicts inside a package.
- Scope: the whole repository, packages `apps/private`, `apps/public` and `common`.

## 2026-11-24, [Infra] A fork pull request runs no code before a linagora member vouches for its head commit

- Decision: replaces the fork check of the PR image deploy, which let any fork run its tests and was approved by a comment tied to no commit: the Jenkinsfile starts with an `Authorize fork` stage: a pull request from a fork runs nothing of its own (build, tests, scripts, post actions) unless the fork owner is a linagora member, or a member approved its head commit, submitted a review "Build this please" on it, or commented "Build this please <sha>" with its full id. No credential is bound at pipeline level; `github` and `dockerHub` are bound only around the steps that use them (`withGithubCredential`, `withDockerHubLogin` with a throwaway Docker config). The block holding these helpers is the same in the Jenkinsfiles of twake-contacts-frontend, twake-calendar-frontend, twake-calendar-side-service, webadmin-proxy, tmail-flutter, esn-sabre, tmail-backend and twake-mail-admin, and is changed in all of them.
- Decided by: Benoit Tellier, after the twake-qa security review of twake-calendar-side-service (SEV-1, 2026-11-23); the pipeline of twake-contacts-frontend is the model.
- Why: the agents are persistent and shared, so code of a pull request that runs before the check can read a credential bound later in the same build, or leave a process behind for a later one. A review is tied to a commit by GitHub, unlike a comment, so a commit pushed after the approval is not built until a member reviews it again.
- Scope: `Jenkinsfile` (packages `apps/private`, `apps/public` and `common`).

## 2026-11-24, [UX] A recurring search result previews a loaded occurrence

- Decision: when the occurrences of a series are already in the store, so that the series is not stored under its plain uid, clicking its search result opens the preview of the loaded occurrence that starts with the result, or else of the earliest loaded one. The `getEvent` reducer keeps storing nothing under the plain uid of such a series.
- Decided by: proposed in the fix of [#2204](https://github.com/linagora/twake-calendar-frontend/issues/2204), one of the two fixes suggested by Eriikah in the issue; open to review.
- Why: the fix stays in the search results and leaves the store as the grid reads it since #492, where an entry under the plain uid next to the occurrences could be shown as one more event; the grid already previews occurrences by their key.
- Scope: `common`, search results on desktop and mobile.

## 2026-11-24, [UX] Hovering an event shows its details

- Decision: hovering an event of the day, week or month grid, or giving it the keyboard focus, shows after 500 ms a preview with its full title, its date and time, its calendar (colour and name), its location and the first four lines of its description as plain text. A private event of someone else's calendar shows no location and no description, as in the event preview. Screens without hover show nothing, pressing the event closes the preview, and a dragged or resized event shows none.
- Decided by: Crash-- (CTO), [#2208](https://github.com/linagora/twake-calendar-frontend/pull/2208)
- Why: with several calendars shown side by side the events are too narrow to read their title.
- Scope: desktop, package `common` (event chip of the calendar grid); the list view keeps its rows.

## 2026-11-24, [Architecture] Decisions log at the root for an app

- Decision: Replaces the decision of 2026-11-23, "One decisions log per package". The app keeps one `docs/decisions.md` at the repo root for all its workspaces (`apps/private`, `apps/public`, `common`); only a library monorepo, whose packages are published on their own, keeps one log per package.
- Decided by: Crash-- (CTO), comment on [linagora/twake-contacts-frontend#688](https://github.com/linagora/twake-contacts-frontend/pull/688), 2026-11-24
- Why: the workspaces of an app ship together as one product, so its decisions belong in one log.
- Scope: the whole repository.

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

## 2026-11-25, [Tech] The schedule finds the first row of each day from one index per event store

- Decision: the schedule rows no longer scan and sort every event of FullCalendar to know whether they draw the day indicator. A map from each day to its first event is built in one pass over `calendar.getEvents()`, with the order of `sortEventsByDateTime`, and cached per FullCalendar event store (`getCurrentData().eventStore`) and time zone. The rows read it.
- Decided by: proposed in the fix of [#2220](https://github.com/linagora/twake-calendar-frontend/issues/2220), a variant of option A of the issue by Eriikah; open to review.
- Why: the old per-row scan was quadratic, and opening the schedule of a busy week blocked the main thread for 5.5 s. FullCalendar replaces its event store whenever its events change, so the store tells when the index is stale. The rows keep comparing FullCalendar occurrences, as before, and do not need to match them against the inputs of the grid. Without the store, the index is built again for each row, which still costs one pass and no sort.
- Scope: `common`, schedule (list) view on desktop and mobile.

## 2026-11-25, [UI] The Drive picker skeleton comes from @linagora/twake-app-skeleton

- Decision: the Drive picker dialog shows `DrivePickerSkeleton` of `@linagora/twake-app-skeleton/drive` until the intent is ready, in place of the local `PickerSkeleton`.
- Decided by: Crash-- (CTO), 2026-11-25.
- Why: the apps that open the Drive picker show the same skeleton while it loads; one shared component keeps them alike ([linagora/twake-libs#79](https://github.com/linagora/twake-libs/pull/79)).
- Scope: `common/src/features/Tdrive/components/TdrivePickerDialog.tsx`.
