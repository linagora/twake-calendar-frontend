# Twake Calendar — Accessibility remediation plan

Companion of [`A10Y_AUDIT-2026-10-01.md`](A10Y_AUDIT-2026-10-01.md) (finding IDs such as `GLB-01`, `CAL-02`, `FRM-07`,
`PUB-01` refer to it). Goal: pass an RGAA 4.1.2 audit commissioned by a French administration.

## How to read this plan

**Ranking = return on investment**, with the way an RGAA audit is scored in mind:

- The auditor tests a **sample of pages** (typically 10–20 screens: see `R-01`) against 106 criteria.
- The compliance rate is `criteria met / criteria applicable`, and **a criterion fails if it fails on
  any page of the sample**. A defect present on every page (theme, layout) therefore costs as much
  as a defect on a single page, but fixing it once in the theme clears it everywhere.
- Thresholds: `≥ 100 %` totally compliant, `≥ 50 %` partially compliant, `< 50 %` non-compliant.
  Being "partially compliant" with a credible multi-year plan is the realistic first target.
- Legal prerequisites (statement, mention, contact) are mandatory whatever the score; without them
  the administration is in breach even with good code.

**Effort**: S ≤ 1 dev-day, M 2–5 dev-days, L > 5 dev-days (one developer familiar with the code base).
**Impact**: number of RGAA criteria the action can unlock on the sample, and severity of the barrier removed.

**Validation**: each entry carries a `Validation:` line — `pending` (not reviewed), `approved`
(go), or `denied` (rejected / postponed). Edit it in place.

> **Re-audit** of the first batch (R-01, R-04 → R-07, R-10 → R-17):
> [`A10Y_REAUDIT-2026-10-01.md`](A10Y_REAUDIT-2026-10-01.md).

## Implementation constraint

Remediations are implemented **only when they do not change the visible interface** (ARIA
attributes, semantics, keyboard behaviour, documentation). Any part that would change what users
see (colours, focus indicator, visible labels or asterisks, new elements, displayed texts) is left
out until design validates it, and is listed in the entry under **Blocked (visible change)**.

## High contrast mode (second batch)

Design decision: the visible changes of Tier 1 and Tier 2 are delivered behind a **"High
contrast mode"** setting, in a new *Accessibility* section of the settings (left bar on desktop,
tab on mobile). It is stored on the device (`localStorage`, key `highContrast`), **off by
default**: with the mode off the interface looks exactly as before; with the mode on every
visible remediation of Tier 1 and Tier 2 applies. The mode is mirrored on
`<html data-high-contrast="true">` for the stylesheets outside the MUI theme, and exposed to
components by `useHighContrast()` (`common/src/features/Settings/Accessibility/`). The public
application reads the same setting (same key, effective when both applications share an origin).

Each entry below says what the mode adds under **High contrast mode**.

## Summary

| Rank | ID | Action | Effort | Impact | Findings |
|---|---|---|---|---|---|
| 1 | R-01 | Audit-ready test instance and RGAA page sample | S | Prerequisite | – |
| 2 | R-02 | Accessibility statement, compliance mention, contact | S | Legal (mandatory) | Legal |
| 3 | R-03 | Global visible focus indicator | S | Very high | GLB-01, CAL-03, CAL-10, PUB-02 |
| 4 | R-04 | Page title per view | S | High | GLB-06 |
| 5 | R-05 | Name every unnamed button / selector | S | High | FRM-04, FRM-13, CAL-03, PUB-03, PUB-07, FRM-05 |
| 6 | R-06 | Localise accessibility strings (MUI, pickers, FullCalendar, hard-coded labels) | S | High | GLB-10, GLB-11 |
| 7 | R-07 | Headings, landmarks and skip link | S–M | High | GLB-07, GLB-08 |
| 8 | R-08 | Accessible colour palette (theme tokens) | M | Very high | GLB-02..05, FRM-27, PUB-04 |
| 9 | R-09 | Notification timing and roles | S | Medium | GLB-12 |
| 10 | R-10 | Keyboard-operable date and time fields | S | Blocker removed | FRM-01, FRM-02 |
| 11 | R-11 | Keyboard-operable lists, rows and sidebar actions | S–M | Blocker removed | CAL-01, CAL-04, CAL-05, FRM-03, FRM-06 |
| 12 | R-12 | Accessible calendar colour picker | S–M | Blocker removed | CAL-02 |
| 13 | R-13 | Public booking flow pass | S–M | Blocker removed (public pages) | PUB-01..09 |
| 14 | R-14 | Form labels and groups | M | High | FRM-07, FRM-08, FRM-09, CAL-15 |
| 15 | R-15 | Required fields, errors and status messages | M | High | FRM-10, FRM-11, FRM-17, FRM-22, PUB-06 |
| 16 | R-16 | Dialog, drawer and frame names | S–M | Medium | FRM-12, FRM-18, FRM-20 |
| 17 | R-17 | Automated accessibility regression net | S–M | Protects all of the above | Tooling |
| 18 | R-18 | Event accessible names and status alternatives | M | High (core screen) | CAL-06, CAL-07, CAL-11, CAL-12, CAL-20, CAL-21, FRM-14 |
| 19 | R-19 | Event and grid colour contrast | M | Medium | CAL-08, CAL-09 |
| 20 | R-20 | ARIA states and widget patterns | M | Medium | FRM-15, FRM-20, FRM-21, CAL-16, PUB-08 |
| 21 | R-21 | Focus management and announcements | M | Medium | GLB-09, FRM-16, FRM-17, CAL-23 |
| 22 | R-22 | Attendee popover rework | M | Medium | FRM-05 |
| 23 | R-23 | Reflow and text spacing | S–M | Medium | GLB-13, PUB-09 |
| 24 | R-24 | Fallback / error screens | S | Low–medium | GLB-15, GLB-22 |
| 25 | R-25 | Schedule view and print semantics | M | Low–medium | CAL-13, CAL-14 |
| 26 | R-26 | Session expiry | M–L | Low (possibly exempt) | GLB-14 |
| 27 | R-27 | Minor findings sweep | M | Low | remaining minor findings |
| 28 | R-28 | Multi-year plan and documented derogations | S (org) | Legal (mandatory) | Legal, CAL-18, CAL-24 |

Expected trajectory (estimate, to be confirmed by the formal audit): ranks 1–9 (≈ 2 weeks) remove
the failures shared by every page; ranks 10–17 (≈ 3–4 weeks) remove the blockers on core tasks and
should bring the sample above the 50 % "partially compliant" threshold; ranks 18–27 aim at a high
partial compliance rate.

---

## Tier 0 — Prerequisites

### R-01 — Audit-ready test instance and RGAA page sample
- **Why**: the authenticated application could not be scanned live during the pre-audit (identity
  provider with a self-signed certificate, no seeded data). An external auditor will hit the same wall.
- **What**:
  - Provide a test instance with a trusted certificate, two test accounts and seeded data (events
    with attendees in every participation state, recurring event, shared calendar, booking link,
    public event-preview link).
  - Agree the sample with the administration. Proposal: week view, month view, day view, Schedule
    view, event creation form (compact + expanded), event preview, recurring-edit scope dialog,
    calendar settings modal (settings / access / import tabs), booking-link configuration, search
    results, settings page, public booking page, booking confirmation, public event preview, error
    page, accessibility statement page. Mobile layout of the 3 most used screens.
- **Effort**: S · **Impact**: prerequisite for any measurement.
- **Status**: sample of pages defined above and referenced by the statement. Test instance not
  provided (infrastructure, outside this repository).
- **Validation**: pending

### R-02 — Accessibility statement, compliance mention, contact
- **Why**: legal obligation (art. 47 loi 2005-102, décret 2019-768); currently entirely missing.
- **What**:
  - New runtime variable `ACCESSIBILITY_URL` (next to `PRIVACY_URL` / `TERMS_URL` in `.env.js` and
    `common/src/window.d.ts`), and a compliance-level variable (default `non conforme` until audited).
  - "Accessibilité : <level>" link in the public footer (`PublicLayout.tsx`) and in the private app
    (user menu or settings, plus help menu), translated.
  - Statement content following the official model (generated with the DINUM tool), hosted by the
    administration: level, audit date, sample, non-compliant content, derogations, contact,
    Défenseur des droits recourse.
  - Dedicated accessibility contact (e-mail or form).
- **Effort**: S (code) + organisational · **Impact**: mandatory; removes a legal blocker.
- **Status**: implemented as documents hosted in the repository:
  [`ACCESSIBILITY_STATEMENT-en.md`](ACCESSIBILITY_STATEMENT-en.md) and its French version
  [`ACCESSIBILITY_STATEMENT-fr.md`](ACCESSIBILITY_STATEMENT-fr.md) (status
  "not compliant — no audit performed yet", known barriers, alternatives, contact through GitHub
  issues labelled `accessibility`, Défenseur des droits remedies, instructions for deployers) and
  [`MULTI_YEAR_PLAN.md`](MULTI_YEAR_PLAN.md) (also covers R-28).
- **Blocked (visible change)**: the "Accessibilité : non conforme" mention linking to the statement
  must appear in the interface (public footer, private application: user menu and settings). This
  adds a visible link on every page; it also needs an `ACCESSIBILITY_URL` runtime variable (default:
  the statement on GitHub). Waiting for design validation.
- **Validation**: pending

---

## Tier 1 — Global fixes (every page of the sample)

### R-03 — Global visible focus indicator
- **Fixes**: GLB-01, CAL-03 (visibility part), CAL-10, PUB-02 (focus part).
- **What**: in the theme (`makeCalendarOverrides` and the public theme options), add a
  `MuiButtonBase` / `.Mui-focusVisible` rule `outline: 2px solid <≥ 3:1 colour>; outline-offset: 2px`;
  remove the twake-mui `&:focus { boxShadow: none }` effect; restore a 2 px focused input border in
  a ≥ 3:1 colour; delete `outline: none` in `makeCalendarOverrides.tsx:76` and `MiniCalendar.tsx:156`;
  add `@media (forced-colors: active)` outline. Make `.MoreBtn` visible on `:focus-visible` /
  `:focus-within`. Ideally fix upstream in `@linagora/twake-mui`.
- **RGAA**: 10.7, 3.3 · **Effort**: S · **Impact**: very high — fails on 100 % of pages today.
- **High contrast mode**: implemented. `common/src/theme/highContrast.css`: a 3 px dark ring
  (`#1C1B1F`, offset 2 px) on every `:focus-visible` element and MUI `.Mui-focusVisible`
  (overriding MUI's `outline: 0`, twake-mui's removed button shadow and the `outline: none` of
  the date pickers and mini calendar), drawn inside menu and list items, a 2 px dark border on
  focused text fields, hover-only sidebar actions revealed on focus (CAL-03), system `Highlight`
  colour under Windows forced colours.
- **Validation**: pending

### R-04 — Page title per view
- **Fixes**: GLB-06.
- **What**: a `useDocumentTitle` hook: "<period> – <view> – Twake Calendar" for calendar views,
  "Settings – Twake Calendar", "Search: <query> – …", "Error – …", public "Book a meeting with
  <owner> – …", "Booking confirmed – …", "<event title> – …". Tighten e2e `A11Y-14`.
- **RGAA**: 8.5, 8.6 · **Effort**: S · **Impact**: high — fails on 100 % of pages.
- **Status**: implemented. `useDocumentTitle` (`common/src/hooks/useDocumentTitle.ts`) sets
  "<period> – <view> – Twake Calendar" on the calendar (period worded by FullCalendar in the user
  locale), "Settings – …", "Search Results – …", "Something went wrong – …" on the error page,
  "<booking link> – Book a meeting – …", "Booking confirmed – …", "<event title> – …" and error
  titles on the public pages. Only the browser tab title changes; nothing in the page does.
  Remaining: tighten e2e `A11Y-14` (done with R-17).
- **Validation**: pending

### R-05 — Name every unnamed button and selector
- **Fixes**: FRM-04 (event preview close / more), FRM-13 (copy URL, chip delete, add), CAL-03
  (calendar / booking-link more menus), PUB-03 (success dialog close), PUB-07 (public language
  select), FRM-05 (popover close), CAL-15 (print remove buttons).
- **What**: translated `aria-label` including context ("More actions for calendar <name>",
  "Remove <calendar>"), `aria-haspopup="menu"` + `aria-expanded` on menu buttons.
- **RGAA**: 7.1, 11.9, 1.1 · **Effort**: S · **Impact**: high — these buttons sit on the main screens.
- **Status**: implemented (names only, nothing visible changes): event preview Close / More options /
  Edit in organizer calendar, calendar and booking-link "More actions for <name>" (with
  `aria-haspopup` / `aria-expanded`), CalDAV and secret URL copy buttons, attendee chip remove icon
  (named and taken out of the tab order: chips are removed with Backspace / Delete), attendee
  popover close, booking success dialog close, public language selector, print "Remove <calendar>",
  attendee chat button.
- **Blocked (visible change)**: making the sidebar `.MoreBtn` visible on keyboard focus (they stay
  `opacity: 0` until hover) changes the rendering — handled with the focus indicator, R-03.
- **High contrast mode**: the hover-only sidebar actions are revealed on keyboard focus (done with
  R-03, `common/src/theme/highContrast.css`). Nothing else of R-05 was visible.
- **Validation**: pending

### R-06 — Localise accessibility strings
- **Fixes**: GLB-10, GLB-11, part of CAL-02, CAL-15, PUB-07.
- **What**: pass `frFR` / `ruRU` / `viVN` from `@mui/material/locale` to the theme and the matching
  `@mui/x-date-pickers` `localeText` (according to the current language); pass FullCalendar
  `closeHint`, `timeHint`, `eventHint`, `moreLinkHint`, `allDayText` through `t()`; replace the 14
  hard-coded English names and 3 alts by locale keys; `lang` attribute on each language option;
  translate `<noscript>`. Update e2e locators relying on English labels.
- **RGAA**: 8.7, 11.9 · **Effort**: S · **Impact**: high for a French audit — English names on every
  dialog.
- **Status**: implemented for strings that are not displayed: every hard-coded English accessible
  name goes through `t()` (dialog expand / collapse / close, print and Tdrive close, access-right
  "Remove <user>", "Remove <calendar>", regular hours add / remove / copy slot, booking strip
  "Edit <link>"); `lang` on each language option (desktop, mobile, public selectors); FullCalendar
  `timeHint` / `eventHint` (visually hidden Schedule view headers); camera icon made decorative
  (`alt=""`, always next to a text), Tdrive logo alt "Twake Drive". e2e locators updated
  (`expand` → "Show more options", slot actions, French test).
- **Blocked (visible change)**: these strings are displayed, so translating them changes what
  users see: MUI core locale (`frFR`… — Autocomplete "No options" / "Open" / "Clear", Alert close
  tooltip), date picker `localeText` (toolbar texts, month arrows tooltips), FullCalendar
  `closeHint` / `moreLinkHint` (rendered as `title` tooltips), `allDayText`, default
  `'Select timezone'` placeholder, `<noscript>` text. The colour picker label is done with R-12.
- **High contrast mode**: the displayed texts follow the user language — MUI core locale merged
  into the theme (`common/src/theme/highContrastTheme.ts`: Autocomplete, Alert close…), complete
  date picker `localeText` (month arrows, toolbar…), FullCalendar `closeHint`, `moreLinkHint`
  ("Show 3 more events") and `allDayText`, default timezone placeholder. Remaining: `<noscript>`
  text (no JavaScript, so no setting to read).
- **Validation**: pending

### R-07 — Headings, landmarks and skip link
- **Fixes**: GLB-07, GLB-08.
- **What**: one `<h1>` per view (visually hidden on the calendar: "Calendar – week of …"); map
  typography variants to the right elements (`component="h2"`, `component="span"` for labels styled
  as `h6`, no `variant: 'h6'` in `ListItemText`); sidebar out of `<main>` as `<nav>` / `<aside>`;
  `role="search"` on the search bar; `<header>` and `<main>` in `PublicLayout` and the Error page;
  "Skip to calendar" / "Skip to content" link as first focusable element.
- **RGAA**: 9.1, 12.6, 12.7 · **Effort**: S–M · **Impact**: high — fails on 100 % of pages.
- **Status**: implemented without visible change:
  - one `<h1>` per view: visually hidden on the calendar ("<period> – <view>"), settings and mobile
    search results; the visible "Search Results", error, public booking link name and public event
    title become the `<h1>`;
  - heading levels follow the structure: settings sections `<h2>`, event preview title `<h2>`
    (dialog) or `<h1>` (public page), public success dialog `<h2>`; labels and values styled as
    headings (repeat options, all day, calendar modal fields, resources, view switcher items,
    owner name…) are no longer `<h1>`–`<h6>` elements. Only the element changes: the typography
    variant, hence the rendering, is unchanged;
  - landmarks: the desktop sidebar is an `<aside>` named "Calendars and navigation", the desktop
    search bar has `role="search"`, public pages get `<header>` and `<main>`, the error page a
    `<main>`;
  - shared `VisuallyHidden` component (`common/src/components/VisuallyHidden`).
- **Blocked (visible change)**: skip link — it must become visible when it receives focus. Moving
  the sidebar out of `<main>` changes the layout (it stays an `<aside>` nested in `<main>`). Mobile
  search has no persistent search form to carry `role="search"`.
- **High contrast mode**: "Skip to content" link (`common/src/components/SkipLink`), first focusable
  element of the private and public applications, off screen until focused; it moves the focus
  to the `<main id="main-content">` of the calendar, settings and public pages. Remaining: the
  desktop sidebar stays inside `<main>` (moving it out is a layout change not worth its risk
  while it is a named `<aside>`).
- **Validation**: pending

### R-08 — Accessible colour palette
- **Fixes**: GLB-02, GLB-03, GLB-04, GLB-05, FRM-27, PUB-04 (selected-slot colour), PUB-06 (error colour).
- **What** (needs a design decision): a primary shade usable under white text (e.g. orange ≈
  `#C2410C` ≈ 5:1, or dark text on the current orange ≈ 7:1; public blue `#006bd8` 5.1:1);
  `text.secondary` alpha ≥ 0.80; error / warning / success "dark" shades for text; placeholder
  ≥ 4.5:1; input / outlined button borders ≥ 3:1; IconButton default colour ≥ 3:1. Ideally done in
  `@linagora/twake-mui` so all Twake apps benefit.
- **RGAA**: 3.2, 3.3 · **Effort**: M · **Impact**: very high — contrast fails on 100 % of pages.
- **High contrast mode**: implemented (`HIGH_CONTRAST_COLORS` in
  `common/src/theme/highContrastTheme.ts`, checked by a unit test): primary `#B5470F` (private,
  5.4:1) / `#0057B8` (public, 6.9:1), error / warning / success / info darkened to ≥ 5:1, secondary
  text 6.5:1, placeholders 5.3:1, field and outlined button borders 3.4:1, icon buttons 5.6:1. The
  calendar palette and the date picker overrides are rebuilt from the high contrast palette
  (stronger arrows and weekday labels, 12 px instead of 10 px). Outside the theme: mini calendar
  today / selected day, settings navigation and tab indicators (plus bold / underline), weekday
  buttons, day badge, user menu icons, version caption. Not in this action: event chips and grid
  chrome (R-19).
- **Validation**: pending

### R-09 — Notification timing and roles
- **Fixes**: GLB-12.
- **What**: `SnackBarAlert` default ≥ 6–10 s with pause on hover/focus; errors never auto-hide;
  `role="status"` for success / info, `role="alert"` for errors only; translated `closeText`.
- **RGAA**: 13.1, 7.5 · **Effort**: S · **Impact**: medium.
- **Status**: implemented. Success and information messages are `role="status"`, errors
  `role="alert"` (always: not visible). **High contrast mode** (`useMessageDuration`): messages
  stay at least 10 s, errors stay until dismissed (settings save errors, Tdrive picker error,
  people search errors); with the mode off the designed durations apply.
- **Validation**: pending

---

## Tier 2 — Blockers on core tasks

### R-10 — Keyboard-operable date and time fields
- **Fixes**: FRM-01, FRM-02.
- **What**: `ReadOnlyPickerField` opens on Enter / Space / Alt+ArrowDown (or render a labelled
  "Choose date" button); remove `onFocus: blur()` from `TouchTimePickerField`; keep focus on commit
  in `EditableTimeField`.
- **RGAA**: 7.3, 7.1 · **Effort**: S · **Impact**: blocker — creating or moving an event is
  impossible without a mouse today.
- **Status**: implemented. Read-only date and time fields open their picker with Enter, Space or
  Alt+Arrow Down (`aria-haspopup="dialog"`). The touch time field still drops the focus after a
  tap, but keeps it when it comes from the keyboard or an assistive technology (`:focus-visible`).
  Keyboard usage documented in [`KEYBOARD.md`](KEYBOARD.md).
- **Blocked (visible change)**: the requested "Keyboard" section in the left bar of the settings
  page adds a visible navigation entry and page — documented in `KEYBOARD.md` until validated.
  Keeping the focus in the editable time field after Enter / Escape is done with R-21.
- **Second batch**: the requested *Keyboard* section is in the settings, *Accessibility* entry of
  the left bar (tab on mobile): a table of the main shortcuts (keys / action, translated), next to
  the high contrast switch. It is part of the Accessibility section, which exists whatever the
  mode.
- **Validation**: pending

### R-11 — Keyboard-operable lists, rows and sidebar actions
- **Fixes**: CAL-01 (Schedule view events), CAL-04 (long-press only below 900 px), CAL-05
  (booking-link `div onClick`), FRM-03 (`AttendeeOptionsList` standalone), FRM-06 (mobile search results).
- **What**: real buttons / `ListItemButton` inside `<ul>`; Schedule chip wrapped in a button calling
  the `eventClick` handler; always render the "more" button, keep long-press as a shortcut.
- **RGAA**: 7.3, 7.1, 9.3, 10.11 · **Effort**: S–M · **Impact**: blocker removed on 5 features.
- **Status**: implemented. Shared `buttonLikeProps` (`common/src/utils/keyboardActivation.ts`):
  Schedule view events (title on desktop, whole card on mobile — their click reaches FullCalendar's
  `eventClick`), booking-link rows, standalone people / calendar / filter option lists, mobile
  search results. Calendar rows open their actions menu with Shift+F10 or the Menu key
  (`aria-keyshortcuts`), at every width — the keyboard counterpart of the long press.
- **Blocked (visible change)**: rendering the "more" button in narrow layouts. The default browser
  focus outline appears on the newly focusable elements; a designed focus indicator is R-03.
- **High contrast mode**: the calendar "more actions" button is rendered in narrow layouts too
  (no need for a long press), and the sidebar actions are always shown instead of only under the
  mouse.
- **Validation**: pending

### R-12 — Accessible calendar colour picker
- **Fixes**: CAL-02.
- **What**: `role="radiogroup"` labelled by the "Colour" heading, swatches `role="radio"` +
  `aria-checked` + roving tabindex, translated colour names, labelled hex field, translated
  react-colorful slider labels.
- **RGAA**: 7.3, 7.1, 11.1, 11.5 · **Effort**: S–M · **Impact**: blocker removed.
- **Status**: implemented without visible change: the preset and current custom colours form a
  `radiogroup` named "Color" (or the caller's `ariaLabel`), each swatch a `radio` with
  `aria-checked` and a translated colour name ("Green", "Custom color #12AB34"…); one Tab stop on
  the selected colour, arrows move and select (wrapping), Space / Enter select. The custom colour
  button is keyboard-operable (`aria-haspopup` / `aria-expanded`); the hex field is labelled by
  its visible "Hex" text; react-colorful's sliders get translated names.
- **Blocked (visible change)**: none for keyboard and names. react-colorful's
  `aria-valuetext` ("Saturation 40%, Brightness 80%") stays in English (re-rendered by the
  library at each move).
- **Validation**: pending

### R-13 — Public booking flow pass
- **Fixes**: PUB-01 → PUB-09.
- **What**: visible labels + `required` + "* required fields" legend + `autocomplete="name"` /
  `"email"` in a real `<form>`; `shouldDisableDate` instead of slot `disabled`, focus-visible on days,
  `gridcell` filler cells; time slots in a labelled group with full date-time names, `aria-pressed`,
  live "N slots available on <date>"; success dialog `aria-labelledby` / `aria-describedby`, named
  close, focus management; RSVP buttons with `aria-pressed`; fluid 320 px calendar.
- **RGAA**: 11.1, 11.2, 11.10, 11.13, 10.7, 7.1, 7.3, 7.5, 3.1, 10.11 · **Effort**: S–M ·
  **Impact**: blocker removed on the only screens used by citizens / external users — the most
  exposed pages for an administration.
- **Status**: implemented without visible change:
  - booking form: name and e-mail fields get an accessible name and `autocomplete="name"` /
    `"email"`; a failed check moves the focus to the field in error (its message is linked by
    `aria-describedby`); submit and load errors are `role="alert"`;
  - date grid: unavailable and past days are also given to the grid through `shouldDisableDate`,
    so arrow keys skip them; the empty cells outside the month are grid cells;
  - time slots: a group named "Available times on <long date>", `aria-pressed` on the selected
    slot, a polite status region announcing "N time slots available on <date>" (or "no slots")
    when a day is picked;
  - success dialog named by its title and described by its summary;
  - public RSVP: buttons grouped under the question (also on mobile, where it is not displayed),
    the current answer says so in hidden text; loading spinners named;
  - decorative images (camera icon whose alt was a raw translation key, error illustrations)
    get an empty alt.
- **Blocked (visible change)**: visible labels and required-field indicator (asterisk + legend),
  validating every field at once and on blur instead of on each keystroke, a visible focus
  indicator on the date grid days (their focus style is overridden), a `<form>` wrapper so
  that Enter submits, focus restoration after the success dialog (programmatic focus shows a
  focus ring), selected slot colour contrast, 320 px reflow of the date grid.
- **High contrast mode**: booking form with visible labels (MUI then shows the required asterisk)
  and an "asterisk = required" legend, inside a real `<form>` (Enter submits, the Confirm button
  is its submit button), e-mail checked when leaving the field instead of at each keystroke;
  selected time slot drawn filled (not by colour only); 12 px padding around the date grid on
  mobile so that it fits 320 px; focus brought back to the page content once the success dialog
  is gone. Day focus and slot colours come with R-03 / R-08. Not done: the current public RSVP
  answer stays a disabled button (PUB-08).
- **Validation**: pending

### R-14 — Form labels and groups
- **Fixes**: FRM-07, FRM-08, FRM-09, CAL-15.
- **What**: make `FieldWithLabel` render `<label htmlFor>` (or `aria-labelledby`) and pass ids down —
  this fixes most fields at once; move `aria-label` from `slotProps.input` to `slotProps.htmlInput`;
  fix the dangling `labelId`s; label the ~25 remaining fields (repeat, search, filters, access rights,
  regular hours with the day name); `aria-labelledby` or fieldset/legend on radio / toggle groups;
  move inputs out of radio labels in the repeat "Ends" group. Tighten e2e `A11Y-07` (placeholder is
  not a label).
- **RGAA**: 11.1, 11.2, 11.5, 11.6 · **Effort**: M · **Impact**: high — the event form is in every sample.
- **Status**: implemented without visible change:
  - accessible names moved from the input wrapper to the `<input>` (title, location, description,
    CalDAV and secret URLs);
  - names added to: repeat interval / unit / end date / occurrence count, "Show me as" and
    notification selects (their `labelId` pointed to nothing), main and mobile event search,
    search filters (labels tied with `id`, filters grouped under their label), resource search,
    counter-proposal message (via the placeholder), access-rights user search and per-user right
    ("Access for <name>"), timezone search, booking title and duration, regular hours day switch
    and start / end times prefixed with the day;
  - groups named: repeat "how many times" radio group, recurrence scope radios, event visibility
    and calendar visibility toggles, weekday buttons (full day names instead of "MO"), RSVP
    buttons, print scale / layout toggles and extra calendars;
  - the people search hidden label no longer depends on a class only defined in the private
    stylesheet.
- **Blocked (visible change)**: replacing placeholder-only fields by visible labels (title,
  location, description, searches, counter-proposal message); taking the date and number inputs
  out of the "Until" / "After" radio labels (layout change).
- **High contrast mode**: visible labels where a field only had a placeholder: event title and
  booking schedule title in the compact forms, counter-proposal message. Description and location
  already show their label next to the field; searches keep their search icon and button as
  visible cue. Not done: the "Until" / "After" inputs stay inside their radio labels.
- **Validation**: pending

### R-15 — Required fields, errors and status messages
- **Fixes**: FRM-10, FRM-11, FRM-17 (announcement part), FRM-22, PUB-06.
- **What**: `required` on mandatory fields + legend; `DateTimeError` with id + `aria-describedby`
  from the fields + live region; on blocked submit, show a message, move focus to the first invalid
  field; explain disabled Save; `role="status"` live region for search result counts and loading
  states.
- **RGAA**: 11.10, 11.11, 7.5 · **Effort**: M · **Impact**: high.
- **Status**: implemented without visible change:
  - date / time validation message: `role="alert"` (warnings `role="status"`), and every date or
    time field in error points to it with `aria-describedby` (shared through
    `DateTimeErrorIdContext`, also for the time fields of booking regular hours);
  - booking schedule form error: `role="alert"`; calendar name: `aria-required`;
  - search results: a status region announces "Loading…", "N events found" or "No events found";
    search errors are `role="alert"`; the "no results" illustration is decorative;
  - loading spinners named (event update, people search, RSVP).
- **Blocked (visible change)**: visible required-field indicators and legend (asterisks), a
  visible explanation next to the disabled calendar Save button, naming the missing field in the
  booking schedule error message, keeping focus on the first invalid field when Save is pressed
  (the event form keeps Save usable and the date error is announced as soon as it appears).
- **High contrast mode**: calendar name marked required (asterisk) with "A name is required to
  save the calendar." under the field while it is empty — the reason why Save is disabled,
  linked to the field; the booking schedule error names what is missing (calendar, slot
  duration, regular hours with a slot ending before it starts); public booking form: required
  asterisks and legend (R-13). Not done: moving the focus to the first invalid field on Save in
  the event form (Save stays usable and the date error is announced as soon as it appears).
- **Validation**: pending

### R-16 — Dialog, drawer and frame names
- **Fixes**: FRM-12, FRM-18, FRM-20 (naming part).
- **What**: separate title element carrying `titleId` (kept in expanded mode); event preview
  labelled by its title; `aria-label` for the calendar modal, touch pickers, Tdrive dialog, drawers,
  mobile dialogs; `DialogTitle component="div"` + inner heading; `title` on the Tdrive iframe after
  `intent.start` (and upstream fix in cozy-interapp).
- **RGAA**: 7.1, 2.1, 9.1, 8.2 · **Effort**: S–M · **Impact**: medium.
- **Status**: implemented without visible change:
  - `ResponsiveDialog` is named after its title text only (no longer "Title expand close"),
    keeps that name in expanded mode where the back button replaces the title, and accepts
    `ariaLabel` / `ariaLabelledBy` when the title is not text: event preview → event title,
    calendar modal → "New calendar" / "Calendar settings", booking confirmation → "Confirm your
    booking";
  - names for the dialogs and drawers that had none: touch date / time pickers (field label),
    Tdrive picker (and a `title` on its iframe), calendar search and availability search dialogs
    (instead of "Back" + the search field), mobile and tablet sidebars, mobile app grid and user
    menu, "more events" drawer, mobile bottom-sheet selectors (`label` prop: language, time
    zone, search in), whose trigger now says "<label>: <value>" with `aria-haspopup` /
    `aria-expanded`.
- **Blocked (visible change)**: none identified. Remaining (not visual, not done): `DialogTitle`
  still renders an `<h2>` that contains the title bar buttons; the mobile search overlay is a
  plain `Paper` without dialog semantics nor focus management; mobile bottom sheets do not move
  the focus inside (`disableAutoFocus`).
- **Validation**: pending

### R-17 — Automated accessibility regression net
- **Fixes**: tooling gap (audit §3.6).
- **What**: add `eslint-plugin-jsx-a11y` (recommended config, as warnings first); add
  `com.deque.html.axe-core:playwright` to the e2e suite with one axe check per sampled page
  (private and public), failing on `serious` / `critical`; add keyboard-only e2e scenarios for the
  blockers fixed in R-10 → R-13; fix the e2e tests that rely on placeholders.
- **RGAA**: none directly · **Effort**: S–M · **Impact**: protects the score between audits; makes
  the re-audit cheaper.
- **Status**: implemented.
  - `eslint-plugin-jsx-a11y` (recommended rules, as warnings: `npm run lint` stays at 0 errors;
    18 warnings reported on the current code).
  - e2e `AxeScanTest` (`com.deque.html.axe-core:playwright`): WCAG 2.1 A / AA axe scan of the
    week view, expanded event form, event preview, settings page, a populated public booking
    page and the unknown booking link page. Known failures are listed per page in the test and
    must be removed from it as their fix lands: `color-contrast` (R-08) everywhere; on the
    calendar `aria-hidden-focus` (CAL-11), `aria-valid-attr-value` and `nested-interactive`
    (CAL-16), `listitem` (sidebar list items outside a list — new), `scrollable-region-focusable`
    (FullCalendar scroller — new); on settings `list` (navigation list holding buttons — new).
  - e2e `A11Y-07` no longer accepts a placeholder as a label; `A11Y-14` and `SHELL-10` check
    that the title names the view.
  - Unit tests for the new behaviours (keyboard helper, colour radio group, date / time error,
    slot status, dialog naming, document title).
  - Full e2e suite run on this branch: 576 tests; page objects updated where they relied on the
    old names (unnamed overflow button, exact RSVP names, copy buttons, "MO" weekdays,
    "expand", "select color #…", Enter in date fields).
- **Second batch**: e2e `AxeScanHighContrastTest` runs the six scans with the mode on (set in
  `localStorage` before the application loads) and **with `color-contrast` checked**: event form,
  event preview (scoped to the dialog), settings, public booking page and unknown booking link
  pass; the calendar view keeps `color-contrast` as a known failure (event chips and grid
  chrome, R-19). `A11Y-15` switches the mode from the settings and checks it survives a reload.
- **Validation**: pending

---

## Tier 3 — Remaining major findings

### R-18 — Event accessible names and status alternatives
- **Fixes**: CAL-06, CAL-07, CAL-11, CAL-12, CAL-20, CAL-21, FRM-14.
- **What**: in `eventDidMount`, `role="button"` + full name ("10:00–11:00, <title>, calendar <name>,
  declined, private, recurring"); `titleAccess` or visually hidden text on status icons; distinct
  icons for tentative / needs-action; attendee badges with status text; move the timezone selector
  out of FullCalendar's `aria-hidden` axis.
- **RGAA**: 1.1, 3.1, 7.1 · **Effort**: M · **Impact**: high — the calendar grid is the core screen.
- **Validation**: pending

### R-19 — Event and grid colour contrast
- **Fixes**: CAL-08, CAL-09.
- **What**: compute the chip text colour against the real chip background until 4.5:1 is reached
  (fix the white fallback in `getAccessiblePair`), no opacity on time text, darker `dark` values in
  the default palette, darker grid chrome tokens (hour / weekday labels, today marker, now line),
  checkbox drawn with the `dark` colour.
- **RGAA**: 3.2, 3.3 · **Effort**: M · **Impact**: medium (user-chosen colours make it hard to reach
  100 %; document residual cases).
- **Validation**: pending

### R-20 — ARIA states and widget patterns
- **Fixes**: FRM-15, FRM-20, FRM-21, CAL-16, PUB-08.
- **What**: `aria-pressed` instead of `disabled` for the current RSVP answer; `aria-expanded` on
  disclosure buttons; UserMenu restructured (no nested menu); ViewSwitcher as buttons with
  `aria-current`; tabs with tabpanels; add button moved out of accordion summaries, slug ids.
- **RGAA**: 7.1 · **Effort**: M · **Impact**: medium.
- **Validation**: pending

### R-21 — Focus management and announcements
- **Fixes**: GLB-09, FRM-16, FRM-17 (focus part), CAL-23.
- **What**: focus the new view's `<h1>` on calendar / settings / search transitions and restore it on
  return; focus the first revealed field when a collapsed form row expands; focus the results
  heading after a search; polite live region announcing the displayed period after prev / next /
  today / swipe.
- **RGAA**: 12.8, 7.5 · **Effort**: M · **Impact**: medium.
- **Validation**: pending

### R-22 — Attendee popover rework
- **Fixes**: FRM-05.
- **What**: MUI `Popover` (focus moved in, Escape, focus restored) or non-portalled Popper inside the
  dialog; trigger named "Details for <name>" with `aria-expanded`; open on click / Enter, not only
  hover. Shared by the private and public apps.
- **RGAA**: 7.1, 7.3, 10.13, 12.8 · **Effort**: M · **Impact**: medium.
- **Validation**: pending

### R-23 — Reflow and text spacing
- **Fixes**: GLB-13, PUB-09.
- **What**: `min-height` instead of fixed menubar height, no `overflow: hidden` on the header; fluid
  booking calendar cells below 360 px; remove fixed widths; test with a text-spacing bookmarklet and
  at 200 % / 400 % zoom.
- **RGAA**: 10.11, 10.12, 10.4 · **Effort**: S–M · **Impact**: medium.
- **Validation**: pending

### R-24 — Fallback and error screens
- **Fixes**: GLB-15, GLB-22.
- **What**: distinguish "new version" from "service unreachable" in the bootstrap fallback; set
  `document.documentElement.lang` when the fallback is shown; `aria-hidden` on decorative SVGs;
  translated, non-technical error messages; no `word-break: break-all`.
- **RGAA**: 8.3, 1.2, 11.10 · **Effort**: S · **Impact**: low–medium.
- **Validation**: pending

### R-25 — Schedule view and print semantics
- **Fixes**: CAL-13, CAL-14.
- **What**: keep real day headings (full date) in the Schedule view, as a list grouped per day or a
  proper table; print document: `lang` on the outer window, `<table>` with `<th scope>` for grids,
  lists with date headings for the agenda, readable contrast (dark text on light colour).
- **RGAA**: 5.x, 9.1, 8.3, 3.2 · **Effort**: M · **Impact**: low–medium.
- **Validation**: pending

### R-26 — Session expiry
- **Fixes**: GLB-14.
- **What**: first measure the effective session lifetime (> 20 h is exempt from RGAA 13.1). If
  shorter: silent token renewal, warning before expiry with an "extend" action, preserve the event
  draft across the SSO redirect (`eventFormTempStorage` already exists).
- **RGAA**: 13.1 · **Effort**: M–L · **Impact**: low if the session is long; otherwise medium.
- **Validation**: pending

### R-27 — Minor findings sweep
- **Fixes**: GLB-16 → GLB-21, CAL-17, CAL-19, CAL-22, CAL-25, FRM-21 → FRM-31, PUB-10 → PUB-13.
- **What**: `alt=""` on decorative images (camera icon, error illustrations, app icons), loading
  status text, logo button name, new-window hints, keyboard-focusable scroll areas, `readOnly`
  instead of `disabled` URL fields, global `.visually-hidden` class, localised touch date format,
  full weekday names, `prefers-reduced-motion` media query, "+N more" popover as a proper dialog.
- **RGAA**: 1.2, 6.1, 7.x, 10.x, 13.2 · **Effort**: M (batch) · **Impact**: low individually,
  needed for a high partial-compliance rate.
- **Validation**: pending

### R-28 — Multi-year plan and documented derogations
- **Fixes**: legal prerequisites (audit §3.5), CAL-18, CAL-24.
- **What**: with the administration, publish the *schéma pluriannuel* (3 years) and the annual action
  plan (this document can serve as its basis); list in the statement the content that cannot reach
  compliance at reasonable cost with its alternative: drag & drop on the grid (alternative: event
  form), FullCalendar grid arrow-key navigation (alternative: Tab order + Schedule view),
  user-chosen calendar colours (alternative: text status).
- **RGAA**: legal obligation · **Effort**: S (organisational) · **Impact**: mandatory.
- **Status**: multi-year plan published in
  [`MULTI_YEAR_PLAN.md`](MULTI_YEAR_PLAN.md); known limitations and
  alternatives listed in the statement. To be completed by each deploying administration.
- **Validation**: pending

---

## Added by the second re-audit

### R-29 — High contrast mode within one step of every page
- **Why**: an accessible alternative version only counts if it can be reached from the
  non-conforming page; the public pages had no way to switch the mode on.
- **What**: a "High contrast mode" switch at the foot of every side bar (calendar on desktop,
  tablet and mobile, settings) and in the footer of the public pages.
- **Status**: implemented (`HighContrastSwitch`).
- **Validation**: pending

### R-30 — Describe the high contrast mode
- **What**: a flyover on the switch (hover and keyboard focus), the same description given to
  screen readers, and a "High contrast mode" section in the accessibility statement, in every
  language of the application (EN, FR, RU, VI).
- **Status**: implemented.
- **Validation**: pending

### R-31 — Event chips and grid chrome in high contrast mode
- **Why**: last `color-contrast` failure in high contrast mode (calendar grid).
- **What**: R-19 applied when the mode is on.
- **Status**: implemented with the mode on (audit of 2026-10-05): event chips write in the
  darkest or the lightest colour, whichever reads best on the calendar colour, at full opacity;
  today, weekday names, hours, the current time and the days of other months reach 4.5:1. The
  calendar colours themselves (chip tint, calendar checkboxes) stay the colours users chose.
- **Validation**: pending
