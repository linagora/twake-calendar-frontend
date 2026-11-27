# Decisions

Decisions taken on @calendar/common, oldest first. Append only: a decision that changes gets a new entry that replaces the old one and cites it. Entry format: the `twake-decisions` skill of [linagora/twake-guidelines](https://github.com/linagora/twake-guidelines/blob/main/skills/twake-decisions/SKILL.md).

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

## 2026-11-26, [Product] OPEN: what the reply asked is checked against before it is written

- Decision: the reply asked with `OPEN` is written at once only when (1) the calendar it was found in lets the user write (their own, or a delegation with write); (2) the event, read again from the server right before the write, still has the title and the start of `expected`, the occurrence picked still there and read as the server now holds it (the organizer may have renamed, moved or removed it since the lookup; otherwise nothing is written and the preview shows the « not sent » line of `intents.replyNotSent`); (3) the occurrence picked is not one its organizer cancelled: a cancelled occurrence reads as a cancelled event (`error.eventCanceled`, then cancel), as a cancelled series does. `expected.start` must be an ISO 8601 date or date-time (any offset): another shape `Date.parse` would take (« Nov 23 2026 ») is invalid data.
- Proposed by: Twake Chat team, from the CodeRabbit review of PR #2218 (2026-11-26); to be confirmed by the maintainers of Twake Calendar.
- Why: the reply must go out only on the meeting the card showed, as the user, where they may answer; and `Date.parse` reads non-ISO strings differently in each browser.
- Scope: `parseExpected`, `foundLookup` (`openEventIntent.ts`), `useAskedReply` (`useOpenEventReplies.ts`).

## 2026-11-26, [Product] OPEN replies to an occurrence alone, as the user

- Decision: when the event `OPEN` shows is an occurrence (the master of the series does not invite the user), the reply, asked or clicked, is written on that occurrence alone (its RECURRENCE-ID, the « this occurrence » path of the reply buttons), with the address of the signed-in user, never on the other occurrences they are invited to, nor as the owner of a delegated calendar. A close waits for every reload of a reply in flight (counted), and a reply the server confirmed stays the answer even when the reload fails. It makes precise « A recurring event gets the reply for the whole series » of « Intent OPEN io.cozy.calendar.events: preview and reply »: that holds when the master invites the user.
- Decision (2026-11-27, makes precise « OPEN replies to the occurrence the user is invited to » and the check of `expected`): the reply asked goes at once (1) to the occurrence whose RECURRENCE-ID is `expected.start`, when that occurrence invites the user and the master does not; (2) to the whole series when `expected.start` is the DTSTART of a master that invites the user, as before; (3) to the one occurrence that invites the user when `expected.start` is the DTSTART of a master that does not; (4) to none when several occurrences invite the user and `expected.start` is that DTSTART: the card names none of them, the preview shows and the user clicks. The read again before the write checks the same VEVENTs. Two reloads of an occurrence in flight at once (two clicks) leave the store with the reply the server confirmed last: the answer of the older reload, ending after the newer one started, is dropped, even when the newer reload fails.
- Proposed by: Twake Chat team, from the CodeRabbit review of PR #2218 (2026-11-26, rules 1 to 4 on 2026-11-27); to be confirmed by the maintainers of Twake Calendar.
- Why: the « all occurrences » path wrote every future occurrence that lists the user, and the address of the owner of a delegated calendar; the preview checked another row.
- Scope: `useReplyToOccurrence`, `useCloseOnceAnswered` (`common/src/features/intents/useOpenEventReplies.ts`), `foundLookup`, `cardCandidates` (`common/src/features/intents/openEventIntent.ts`).

## 2026-11-26, [UX] The form of CREATE drawn in the page takes dropped files

- Decision: the form of the intent `CREATE`, drawn in the page (no dialog), takes the files dropped on its fields as attachments, with the same drop zone as in its dialog; a file dropped beside it is ignored instead of the browser opening it.
- Proposed by: Twake Chat team, from the CodeRabbit review of PR #2218 (2026-11-26).
- Why: the drop zone lived in the dialog the page no longer draws.
- Scope: `EmbeddedForm` (`common/src/features/Events/EventModal.tsx`), `measureDropArea` (`FILE_DROP_FRAME`, `common/src/components/Dialog/DialogFileDrop.tsx`).
