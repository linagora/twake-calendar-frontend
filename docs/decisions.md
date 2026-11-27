# Decisions

Decisions taken on twake-calendar-frontend, all its workspaces included, oldest first. Append only: a decision that changes gets a new entry that replaces the old one and cites it. Entry format: the `twake-decisions` skill of [linagora/twake-guidelines](https://github.com/linagora/twake-guidelines/blob/main/skills/twake-decisions/SKILL.md).

Categories: UX, UI, Product, Architecture, Infra, Tech.

## 2026-11-20, [UI] The intent pages are drawn in the page, sized by their content

- Decision: the pages of the cozy-stack intents (`CREATE` and `OPEN io.cozy.calendar.events`) draw the form or the preview in the page itself, a `main` landmark the full width of the frame, with no dialog, backdrop or card of their own, and ask the client for the height of their content with cozy-interapp's `resizeClient` when it shows and each time it changes, never once the client has its answer.
- Asked by: Clément Guyon (Twake Chat), 2026-11-20, screenshots of the « Create » dialog of Twake Chat with wide white margins. Design: Twake Chat team; a proposal to the maintainers of Twake Calendar.
- Why: the client (Twake Chat) already draws the dialog around the frame; a second dialog inside left wide empty margins, and a frame of a fixed size never fits the form.
- Scope: desktop and mobile, `common/src/features/intents/` (IntentFrame) and the embedded form of `EventModal`.

## 2026-11-20, [Architecture] The result of CREATE carries the attendees of the saved event

- Decision: the result of the intent `CREATE io.cozy.calendar.events` adds `attendees: { email, name }[]`: every attendee of the saved event, the organizer included, the resources (`CUTYPE=RESOURCE`) left out, `mailto:` stripped, `name` null when the CN is empty or is the e-mail address itself.
- Asked by: Clément Guyon (Twake Chat), 2026-11-20: the attendees on the meeting card of Twake Chat. Design: `name` null when CN = e-mail: Twake Chat team (branch feat/chat-intents-v2), to be confirmed by the maintainers of Twake Calendar (the form saves `cn = email` for the addresses Chat sends).
- Why: the card of the meeting in Twake Chat shows who is invited, as the calendar counts its participants.
- Scope: `createdEvent` (`common/src/features/intents/newEventIntent.ts`).

## 2026-11-20, [Product] Intent OPEN io.cozy.calendar.events: preview and reply

- Decision: Twake Calendar serves `OPEN io.cozy.calendar.events` with the data `{ uid, partstat? }` (`partstat` one of ACCEPTED, DECLINED, TENTATIVE): it looks the event up by its UID as the `/events/:uid` link does, sends `partstat` first through the path of the reply buttons, shows the calendar's preview in the page, and answers `{ partstat }` on close, the reply of the user then, null while they have given none or are not invited. A recurring event gets the reply for the whole series, with no « this occurrence or all » question. A user who is not an attendee sees the preview without the reply buttons. An unknown UID says `error.eventNotFound`, then cancels the intent; a lookup the server fails, or data of another shape, fails it.
- Asked by: Clément Guyon (Twake Chat), 2026-11-20: Yes / No on the meeting card for the people invited. Design of the contract: Twake Chat team; the non-attendee, recurring and wording cases: Twake Chat team (branch feat/chat-intents-v2), to be confirmed by the maintainers of Twake Calendar.
- Why: Twake Chat lets each invited member answer Yes / No from the card of the meeting, with the live replies of Calendar, without leaving the room.
- Scope: desktop and mobile, `common/src/features/intents/` (openEventIntent.ts, OpenEventIntentPage.tsx, IntentPage routing by action).

## 2026-11-20, [UX] The OPEN preview leaves editing to the calendar

- Decision: the preview of the intent OPEN shows the title, the date, the details with the attendees and the reply buttons (with the counter proposal), and leaves out edit, delete, duplicate and move.
- Proposed by: Twake Chat team (branch feat/chat-intents-v2), to be confirmed by the maintainers of Twake Calendar.
- Why: each of them opens another dialog or flow inside the frame of the client, which is there to reply to an invitation.
- Scope: OpenEventIntentPage.

## 2026-11-20, [UX] A cancelled event asked with OPEN reads as missing

- Decision: an event its organizer cancelled, asked with the intent OPEN, shows the calendar's `error.eventCanceled` and cancels the intent once the user closes the message, as an unknown UID does; only the other failures of the lookup fail the intent.
- Proposed by: Twake Chat team (branch feat/chat-intents-v2), to be confirmed by the maintainers of Twake Calendar.
- Why: the server answered; there is just no meeting to reply to, which is no error of the calendar.
- Scope: `failedLookup` (`common/src/features/intents/openEventIntent.ts`).

## 2026-11-20, [UX] The page waits for the reply asked with OPEN before it shows the preview

- Decision: with `partstat`, the page shows its loader until the server answered that reply, then the preview with the reply (or the calendar's error and the former reply).
- Proposed by: Twake Chat team (branch feat/chat-intents-v2), to be confirmed by the maintainers of Twake Calendar.
- Why: the client removes the frame once it has its answer: a close while the reply is in flight would abort it and give the client a stale reply.
- Scope: OpenEventIntentPage.

## 2026-11-20, [Product] OPEN replies to the occurrence the user is invited to

- Decision: when the event of the UID holds several VEVENTs (a series and its overrides), the intent OPEN shows, and replies to, one the user is an attendee of: the event of that UID when they are invited to it, else the first occurrence they are invited to; only when they are invited to none, the event of that UID (the preview without reply buttons). A user invited to one occurrence of a series alone, the master without them, gets the reply asked on that occurrence.
- Proposed by: Twake Chat team, OPEN specs of 2026-11-20 (f7746580, « a user invited to one occurrence of a series only »); the order of the choice: Twake Chat team (branch feat/chat-intents-v2), to be confirmed by the maintainers of Twake Calendar.
- Why: the master of a series organized by someone else may not list the user when they were added to one occurrence only; picking it wrote nothing and showed no reply buttons.
- Scope: `foundLookup` (`common/src/features/intents/openEventIntent.ts`).

## 2026-11-20, [UX] OPEN fails an event found outside the calendars of the user

- Decision: an event the server finds by its UID but in a calendar the user does not list (or an answer with no event the page can read) fails the intent OPEN: the page says `intents.failed` and the client gets an error, instead of `error.eventNotFound` and a cancel. This replaces, for that case, « An unknown UID says `error.eventNotFound` » of the entry « Intent OPEN io.cozy.calendar.events: preview and reply » above; a UID every home answers 404 to still reads `error.eventNotFound` and cancels.
- Proposed by: Twake Chat team, OPEN specs of 2026-11-20 (f7746580, « an event found in no calendar of the user »).
- Why: the event exists; the page cannot show it, which is a failure of the calendar, not a missing meeting the client should forget.
- Scope: `foundLookup` (`common/src/features/intents/openEventIntent.ts`): a null result of `getEventByUid`, or one with no VEVENT.

## 2026-11-20, [UX] A close of the OPEN preview waits for the reply in flight

- Decision: when the user closes the preview of the intent OPEN while a reply they clicked is in flight (and, for an occurrence, until the event is loaded again), the page answers the client once the server answered: the new reply when it confirmed it, the former one when it refused it; never the former one at once.
- Proposed by: Twake Chat team, OPEN specs of 2026-11-20 (f7746580, « a close while the reply the user clicked is in flight »); the reload of an occurrence counted in flight: Twake Chat team (branch feat/chat-intents-v2), to be confirmed by the maintainers of Twake Calendar.
- Why: the client removes the frame once it has its answer, which would abort the reply and leave Twake Chat with a stale one, as for the reply asked with OPEN (entry « The page waits for the reply asked with OPEN » above).
- Scope: OpenEventIntentPage (`useCloseOnceAnswered`); `AttendanceValidation` tells its new optional `onReplyingChange` when a reply starts and ends.

## 2026-11-20, [UX] The messages of an intent that cannot open fit both actions

- Decision: `intents.unavailable` and `intents.untrustedFrame` say « open Twake Calendar (directly) to continue » in every locale, instead of « to create your event »: they show for CREATE and OPEN alike. The keys stay.
- Proposed by: Twake Chat team (branch feat/chat-intents-v2), wording made neutral; to be confirmed by the maintainers of Twake Calendar.
- Why: a user who opens a meeting from Twake Chat creates nothing; « continue » names no action.
- Scope: `common/src/locales/*.json`.

## 2026-11-21, [UI] The intent pages ask the client for the width of their form

- Decision: the pages of the intents `CREATE` and `OPEN` send `resizeClient({ width: 570, height })` on every resize, and lay their content out at 570 px (`normalMaxWidth` of `ResponsiveDialog`), not stretched to the frame.
- Asked by: Clément Guyon (Twake Chat), 2026-11-21: the dialog of Twake Chat starts at 900 px and keeps what the page sends, so the form was stretched. Design: Twake Chat team; a proposal to the maintainers of Twake Calendar.
- Why: the form and the preview had that width in their own dialog of the calendar.
- Scope: `IntentFrame` (`common/src/features/intents/IntentFrame.tsx`).

## 2026-11-21, [UX] A close of the OPEN preview waits 10 s at most for the reply in flight

- Decision: the close of the preview of `OPEN` waits for a reply in flight (and the reload of an occurrence) for 10 s at most; past that, the client gets the former reply and the page closes. It replaces « never the former one at once » of the entry « A close of the OPEN preview waits for the reply in flight » for a server that does not answer.
- Proposed by: Twake Chat team, specs of 2026-11-21; to be confirmed by the maintainers of Twake Calendar.
- Why: the close button of the client is hidden (`hideCross`): a server that never answers would keep the user in the frame for good.
- Scope: OpenEventIntentPage (`useCloseOnceAnswered`).

## 2026-11-21, [Architecture] OPEN sends the reply asked only when the event is the one the card shows

- Decision: the data of `OPEN` is `{ uid, partstat?, expected?: { title, start } }`. The reply asked is sent at once only when the event found has the same title once trimmed (case counts) and the same instant as `expected.start` (any offset) as its DTSTART (master) or as the RECURRENCE-ID of an occurrence. Otherwise (mismatch, or no `expected`) nothing is written and the preview shows with no reply pressed: the click of the user writes once, and closing without a click gives the former reply (`{ partstat: null }` when none). An `expected` that is no `{ title: string, start: ISO date string }` is invalid data, which fails the intent.
- Asked by: Clément Guyon (Twake Chat), 2026-11-21, « Vérifier puis envoyer ». Design: Twake Chat team; to be confirmed by the maintainers of Twake Calendar.
- Why: the UID comes from a Chat message any room member writes: a forged card could make the user's click on another card answer another meeting they are invited to.
- Scope: `parseOpenEventData`, `foundLookup` (`openEventIntent.ts`), OpenEventIntentPage.


## 2026-11-21, [UX] OPEN says when the reply asked was not sent

- Decision: when `OPEN` came with a `partstat` that was not sent (the event found does not match `expected`, or there is no `expected`), the preview shows one info line above the reply section: « This event changed since it was shared: your answer was not sent. Choose it below. » (key `intents.replyNotSent`, translated in every locale). It is not shown when the reply was sent, nor without `partstat`, and it goes once the user clicks a reply.
- Proposed by: Twake Chat team (branch feat/chat-intents-v2), to be confirmed by the maintainers of Twake Calendar.
- Why: a renamed or moved event is the normal path, not an attack, and the reader must not believe they answered.
- Scope: OpenEventIntentPage (`EventPreviewInPage`), `common/src/locales/*.json`.

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

## 2026-11-25, [UX] The preview warns of a SENT-BY outside the domain of the organizer

- Decision: when the `SENT-BY` of the organizer is an address of another domain than the organizer, or has no domain, the event preview shows a warning notice right under the date, naming the sender, the organizer and the organizer's address, and the expanded participant list shows the `Sent by` line in warning color with an icon, marked external, not the organizer. A `SENT-BY` of the organizer's domain (an assistant) keeps the discreet caption. Domains are compared exactly, case-insensitively: a subdomain counts as another domain.
- Decided by: chibenwa in [#2223](https://github.com/linagora/twake-calendar-frontend/issues/2223), with mockups.
- Why: Twake Mail lets a user add an invitation whose mail was not sent by its organizer (linagora/tmail-backend#3162) and records the actual sender as `SENT-BY`; once in the calendar the mail and its warning banner are gone, so the preview is the only place left to tell the user, and a grey caption behind *Show more* looked the same for a legit assistant and an outsider.
- Scope: `common`, `apps/public`, event preview.
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

## 2026-11-26, [Product] OPEN: what the reply asked is checked against before it is written

- Decision: the reply asked with `OPEN` is written at once only when (1) the calendar it was found in lets the user write (their own, or a delegation with write); (2) the event, read again from the server right before the write, still has the title and the start of `expected`, the occurrence picked still there and read as the server now holds it (the organizer may have renamed, moved or removed it since the lookup; otherwise nothing is written and the preview shows the « not sent » line of `intents.replyNotSent`); (3) the occurrence picked is not one its organizer cancelled: a cancelled occurrence reads as a cancelled event (`error.eventCanceled`, then cancel), as a cancelled series does. `expected.start` must be an ISO 8601 date or date-time (any offset): another shape `Date.parse` would take (« Nov 23 2026 ») is invalid data.
- Proposed by: Twake Chat team, from the CodeRabbit review of PR #2218 (2026-11-26); to be confirmed by the maintainers of Twake Calendar.
- Why: the reply must go out only on the meeting the card showed, as the user, where they may answer; and `Date.parse` reads non-ISO strings differently in each browser.
- Scope: `parseExpected`, `foundLookup` (`openEventIntent.ts`), `useAskedReply` (`useOpenEventReplies.ts`).

## 2026-11-26, [Product] OPEN replies to an occurrence alone, as the user

- Decision: when the event `OPEN` shows is an occurrence (the master of the series does not invite the user), the reply, asked or clicked, is written on that occurrence alone (its RECURRENCE-ID, the « this occurrence » path of the reply buttons), with the address of the signed-in user, never on the other occurrences they are invited to, nor as the owner of a delegated calendar. A close waits for every reload of a reply in flight (counted), and a reply the server confirmed stays the answer even when the reload fails. It makes precise « A recurring event gets the reply for the whole series » of « Intent OPEN io.cozy.calendar.events: preview and reply »: that holds when the master invites the user.
- Decision (2026-11-27, makes precise « OPEN replies to the occurrence the user is invited to » and the check of `expected`): the reply asked goes at once (1) to the occurrence whose RECURRENCE-ID is `expected.start`, when that occurrence invites the user and the master does not; (2) to the whole series when `expected.start` is the DTSTART of a master that invites the user, as before; (3) to the one occurrence that invites the user when `expected.start` is the DTSTART of a master that does not; (4) to none when several occurrences invite the user and `expected.start` is that DTSTART: the card names none of them, the preview shows and the user clicks. The read again before the write checks the same VEVENTs, and that the VEVENT the reply goes to (the master, or the occurrence picked) still lists the user and is not cancelled, nor the master of its series: otherwise nothing is written and the « not sent » line shows (the write would put back the attendees read at the lookup). Two reloads of an occurrence in flight at once (two clicks) leave the store with the reply the server confirmed last: the answer of the older reload, ending after the newer one started, is dropped, even when the newer reload fails.
- Proposed by: Twake Chat team, from the CodeRabbit review of PR #2218 (2026-11-26, rules 1 to 4 on 2026-11-27); to be confirmed by the maintainers of Twake Calendar.
- Why: the « all occurrences » path wrote every future occurrence that lists the user, and the address of the owner of a delegated calendar; the preview checked another row.
- Scope: `useReplyToOccurrence`, `useCloseOnceAnswered` (`common/src/features/intents/useOpenEventReplies.ts`), `foundLookup`, `cardCandidates` (`common/src/features/intents/openEventIntent.ts`).

## 2026-11-26, [UX] The form of CREATE drawn in the page takes dropped files

- Decision: the form of the intent `CREATE`, drawn in the page (no dialog), takes the files dropped on its fields as attachments, with the same drop zone as in its dialog; a file dropped beside it is ignored instead of the browser opening it.
- Proposed by: Twake Chat team, from the CodeRabbit review of PR #2218 (2026-11-26).
- Why: the drop zone lived in the dialog the page no longer draws.
- Scope: `EmbeddedForm` (`common/src/features/Events/EventModal.tsx`), `measureDropArea` (`FILE_DROP_FRAME`, `common/src/components/Dialog/DialogFileDrop.tsx`).

## 2026-11-27, [Product] OPEN with no match picks an occurrence that goes on

- Decision: when the event of the UID and the card match none of the occurrences the user is invited to, the intent OPEN shows the first one that is not cancelled, a cancelled one only when all are. This refines, for that case, « else the first occurrence they are invited to » of the entry « OPEN replies to the occurrence the user is invited to » (2026-11-20). A card that names a cancelled occurrence still reads as cancelled.
- Proposed by: Twake Chat team, from the CodeRabbit review of PR #2218 (2026-11-27).
- Why: the first occurrence the server returns may be cancelled while another invites the user; the page said the event was cancelled and dropped a valid invitation.
- Scope: `pickEvent` (`common/src/features/intents/openEventIntent.ts`), package `common`.
