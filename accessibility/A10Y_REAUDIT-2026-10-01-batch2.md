# Twake Calendar — Accessibility re-audit, second batch

| | |
|---|---|
| Date | 2026-10-01 |
| Previous | Pre-audit [`A10Y_AUDIT-2026-10-01.md`](A10Y_AUDIT-2026-10-01.md), first re-audit [`A10Y_REAUDIT-2026-10-01.md`](A10Y_REAUDIT-2026-10-01.md) |
| Audited | Branch `a11y/rgaa-remediations`, second batch `89666ddc` → R-29 / R-30 (15 commits) |
| Design decision | Every visible change of Tier 1 and Tier 2 is delivered behind a **"High contrast mode"** (*Settings › Accessibility*), stored on the device, **off by default** |
| Status | **Pre-audit**: not a formal RGAA conformity audit |

## 1. Verdict

| | Default mode | High contrast mode |
|---|---|---|
| Expected RGAA result | Non conforme (unchanged since the first re-audit: focus, contrast, skip link, visible labels still fail on every page) | **Partially compliant is now within reach.** Every Tier 1 and Tier 2 criterion that failed on every page is addressed. |
| Live scan, public pages (axe, MCP scanner) | 1 rule: `color-contrast` | **0 violations** |
| e2e axe scans, colour contrast checked | not checked (known failure) | Dialogs, settings and public pages pass; calendar grid fails only on colour contrast (event chips, grid chrome: R-19, Tier 3) |

The mode turns the application into an **accessible alternative version** of itself. In WCAG
and RGAA terms, a page that does not conform can count as conforming if a conforming alternate
version exists. That only holds if the version can be reached through an accessible mechanism
from the non-conforming page. Both conditions are now met (section 5):

- **R-29:** the switch is at the foot of every side bar and in the footer of the public pages,
  one step from every page.
- **R-30:** a flyover describes the mode, and so does the accessibility statement, now available
  in every language of the application.

For colour contrast specifically (RGAA 3.2 / 3.3), the reference already accepts "a mechanism
lets the user display the content with a sufficient contrast". The mode is exactly such a
mechanism.

## 2. What the mode changes (second batch)

| Commit | Action | With the mode on |
|---|---|---|
| `89666ddc` | Mode | Switch in *Settings › Accessibility* (side bar on desktop, tab on mobile), `localStorage`, `<html data-high-contrast>` |
| `933afd70` | R-03 | 3 px dark focus ring on every focusable element, menus / lists included, text fields with a thick border, sidebar actions shown on focus, Windows forced colours |
| `767ac4f5` | R-06 (+R-05) | MUI, date picker and FullCalendar texts in the user language |
| `aca6a1b7` | R-07 | "Skip to content" link, first focusable element, shown on focus |
| `03962eb0` | R-08 | Palette reaching 4.5:1 / 3:1 (orange `#B5470F` private, blue `#0057B8` public), no 10 px text in date pickers, mini calendar / settings / weekday / day badge colours |
| `01dd2673` | R-09 | Messages at least 10 s, errors until dismissed (status / alert roles in both modes) |
| `c8ce3926` | R-10 | Keyboard shortcuts table in *Settings › Accessibility* (independent of the mode) |
| `c13d0e09` | R-11 | Calendar "more actions" button in narrow layouts, sidebar actions never hidden until hover |
| `84d5eeb8` | R-13 | Public booking form: visible labels, required asterisks and legend, real form (Enter), e-mail checked on blur, filled selected slot, 320 px date grid, focus back after the success dialog |
| `18c8df35` | R-14 | Visible labels on the fields that only had a placeholder |
| `e7bc3ed1` | R-15 | Required calendar name explained next to the field, booking schedule errors naming the missing field |
| `4920bef0` | R-17 | e2e axe scans in high contrast mode, colour contrast included; A11Y-15 toggles the mode |
| `b478bd2a` | R-29 / R-30 | Switch at the foot of every side bar (calendar desktop / tablet / mobile, settings) and in the public footer, with a flyover on hover and keyboard focus and a screen reader description; "High contrast mode" section in the accessibility statement, now in EN / FR / RU / VI |

R-12 and R-16 had no visible part. **With the mode off, nothing changes visually:** the live scan
in default mode reports exactly the same colours and ratios as in the first re-audit.

## 3. Verification performed

| Check | Result |
|---|---|
| Unit tests (Jest, Node 24) | 1721 tests, 178 suites. A first run under heavy load (e2e in parallel) had 2 time-outs in `Calendar.test.tsx`, green when re-run alone. New tests: mode storage and switch, theme helper, contrast of every high contrast colour (recomputed), skip link, message durations, title label, narrow layout actions, booking form in high contrast mode, booking error messages |
| Lint | 0 errors |
| Type check | no new TypeScript error |
| e2e — accessibility | `AccessibilityTest` (A11Y-01…15), `AxeScanTest` (default mode), `AxeScanHighContrastTest` (mode on, colour contrast checked): all green |
| e2e — full suite | see section 6 |
| Live, MCP accessibility scanner, public pages | Default mode: `color-contrast` only (unchanged). Mode on: **0 violations** on the unknown booking link page and on the invalid event preview page. Keyboard: first Tab reveals "Skip to content" at the top left with a 3 px `#1C1B1F` ring, Enter moves the focus to `<main>`, every button shows the ring |

## 4. Status of the pre-audit findings, high contrast mode

Findings marked ⛔ (blocked: visible change) in the first re-audit, now that the mode exists:

| ID | Default mode | High contrast mode |
|---|---|---|
| GLB-01 Focus indicator | ⛔ | ✅ |
| GLB-02 / GLB-03 / GLB-04 / GLB-05 Contrast | ⛔ | ✅ (theme, pickers, mini calendar, settings, public pages; live scan and e2e axe confirm) |
| GLB-08 Skip link | ⛔ | ✅ (sidebar still nested in `<main>`, as a named `<aside>`) |
| GLB-10 Displayed English strings | ⛔ | ✅ (except `<noscript>`) |
| GLB-12 Message duration | ⬜ | ✅ |
| CAL-03 Sidebar actions invisible on focus | 🟡 | ✅ |
| CAL-04 Long press only | ✅ (Shift+F10) | ✅ (button rendered) |
| CAL-10 Mini calendar focus | ⛔ | ✅ |
| FRM-08 / FRM-09 Visible labels | ⛔ | 🟡 title, booking title, counter-proposal message labelled; radio-nested inputs unchanged |
| FRM-10 / FRM-11 Required and errors | 🟡 | 🟡 required calendar name explained, booking errors named; event form focus on Save unchanged |
| PUB-01 Booking form labels | 🟡 | ✅ |
| PUB-02 Booking date grid focus | 🟡 | ✅ |
| PUB-03 Focus after success | ⛔ | ✅ |
| PUB-04 Selected slot by colour only | 🟡 | ✅ |
| PUB-06 Validation timing / form | 🟡 | ✅ |
| PUB-09 Reflow 320 px | ⛔ | ✅ (date grid) |
| Legal: in-app mention | ⛔ | ⛔ — Tier 0, not part of this batch |

Unchanged (not Tier 1 / 2): CAL-06/07/12 event names (R-18), CAL-08/09 event and grid colours
(R-19, the only remaining contrast failure in high contrast mode), CAL-11 / CAL-16 / NEW-01…03
structure findings, GLB-09 / FRM-16 focus management (R-21), FRM-05 attendee popover (R-22),
GLB-13 / GLB-14 / GLB-15 and the minor findings (R-23 → R-27).

## 5. Actions added by this re-audit

| ID | Action | Status |
|---|---|---|
| R-29 | Make the mode reachable in one step from every page | ✅ switch at the foot of every side bar and in the footer of the public pages (`HighContrastSwitch`) |
| R-30 | Describe the mode | ✅ flyover on the switch (hover and keyboard focus) plus its screen reader description; statement section in EN / FR / RU / VI. Still to do with R-02: the in-app "Accessibilité" mention |
| R-31 | Bring R-19 (event chips, grid chrome) into the mode | ⬜ last `color-contrast` failure in high contrast mode |

## 6. e2e full suite

| Run | Result |
|---|---|
| Full suite on the batch 2 bundle (before R-29 / R-30) | **583 tests**: 574 green. 4 errors from a docker stack that failed to start (infrastructure). 5 timing failures on a loaded machine (unit tests and the audit stack were running in parallel): secret address read before it loads, two 30 s timeouts in sharing / resources / video |
| Re-run of the 15 impacted classes on the final bundle (R-29 / R-30 included), machine otherwise idle | **169 tests**: all the previous failures green. One new failure, A11Y-15: two switches now on the settings page; test adapted (`R-29: A11Y-15 tells the two high contrast switches apart`), `AccessibilityTest` 9 / 9 green |

With the mode off, the whole suite is unchanged apart from the page objects updated in the first
batch. The new scans keep the mode on for their own pages only.

## 7. Live audit of the mode, 2026-10-05

The mode was audited live: the QA environment of `scripts/qa-environment` (origin/main) was
built from this branch, and Playwright drove Chromium on its network (axe `color-contrast` on
every screen, plus screenshots for what axe does not check: placeholders, disabled states,
icons, switches).

| Screen, mode on | Found | Fixed |
|---|---|---|
| Week / day / month grid | Today in light orange (2.09:1), weekday names 2.8:1, hours 2.3:1, current time 2.64:1, days of other months 1.76:1, event chips 2.08–2.96:1 (R-31) | Deep orange today and current time; dark labels; chip text picked for its background, at full opacity |
| Schedule view | Same today badge and weekday names | Same colours as the search results |
| "Discard changes?" dialog | "Continue editing", a secondary outlined button, near white on white (1.14:1) | Secondary outlined and text buttons dark, with a contrasted border |
| Every text field | Placeholders in twake-mui's `secondary.dark` (the mode's override lost on specificity) | Placeholders 5.3:1 |
| Event preview | Current RSVP answer drawn as a disabled grey button; avatar initials white on light gradients | Current answer keeps its colour; dark initials |
| Settings, sidebar | Unchecked switches: white thumb on a 1.5:1 track | Dark track |
| Mobile menu | Selected view, orange on its orange tint (4.17:1) | Deep orange |
| Public booking | Focused field in error lost its red border | Red border kept |

Result: **0 `color-contrast` violation** on the week, month, day and schedule views, the event
preview, the creation and discard dialogs, settings, search, the booking link form, the mobile
layout and menu, the public booking page, form and errors, and the public event preview page.
Unit tests 178 suites / 1725 tests, `AccessibilityTest`, `AxeScanTest` and
`AxeScanHighContrastTest` green.

Left as they are: the calendar colours chosen by users (chip tint, calendar checkboxes and
colour squares, booking link icon), documented as a known limitation in the accessibility
statement; disabled controls, which WCAG exempts.
