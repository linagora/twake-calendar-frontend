# E2E verification screenshots — PRs #1301 and #1302

Playwright headless (Chromium 1400x900), local build of the two PRs deployed
into a running Twake Calendar stack, driven with the `mmaudet` account on
https://calendar-ng.twake-dev.maudet.cloud/.

## PR #1301 (issue #1299 — attendee popover on edit form)

- `1299-attendee-popover.png` — Create modal open, free-solo email
  `herve.grandjean@canut.org` added as a chip, hover the chip → the
  `AttendeePopover` opens with full email, copy icon, "Send mail" and
  calendar buttons — same UI as on the summary view.

## PR #1302 (issue #1300 — unsaved-changes guard)

- `1300-01-dirty-form.png` — Create modal open, title "Test discard changes"
  typed (form is now dirty).
- `1300-02-confirm-on-escape.png` — Escape pressed → `ConfirmDiscardChangesDialog`
  overlays the create modal.
- `1300-03-continue-editing.png` — "Continue editing" clicked → modal stays
  open, title preserved.
- `1300-04-confirm-on-backdrop.png` — backdrop click after re-typing → same
  confirmation dialog.
