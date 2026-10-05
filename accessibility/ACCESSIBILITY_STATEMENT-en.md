# Accessibility statement — Twake Calendar

> **Compliance status: not compliant (no compliance audit has been carried out yet).**
>
> In the terms of the French accessibility reference (RGAA 4.1.2): *« Accessibilité : non conforme »*.

*Version française : [`ACCESSIBILITY_STATEMENT-fr.md`](ACCESSIBILITY_STATEMENT-fr.md).*

This statement covers the Twake Calendar web application published from this repository:

- the authenticated calendar application (`apps/private`);
- the public pages: booking pages and public event previews (`apps/public`).

It is maintained in the source repository so that every release ships with an up-to-date
statement. **An administration deploying Twake Calendar remains responsible for publishing the
statement of its own service**: copy this document, complete the sections marked *[deployer]*,
publish it, and point the application to it (see [For deployers](#for-deployers)).

## Commitment

LINAGORA is committed to making Twake Calendar accessible, in accordance with article 47 of French
law n° 2005-102 of 11 February 2005 and decree n° 2019-768 of 24 July 2019. To that end it publishes:

- a [multi-year accessibility plan](MULTI_YEAR_PLAN.md);
- the current annual action plan: [`A10Y_REMEDIATIONS-2026-10-01.md`](A10Y_REMEDIATIONS-2026-10-01.md).

## Compliance status

Twake Calendar is **not compliant** with RGAA 4.1.2.

**No RGAA compliance audit has been performed yet.** No compliance rate can therefore be stated.
A pre-audit (source review of the whole application and automated tests of the public pages) was
carried out on 2026-10-01; its findings are public: [`A10Y_AUDIT-2026-10-01.md`](A10Y_AUDIT-2026-10-01.md).
A first batch of corrections was re-audited the same day:
[`A10Y_REAUDIT-2026-10-01.md`](A10Y_REAUDIT-2026-10-01.md).

## Non-accessible content

The pre-audit identified, among others, the following barriers (full list with locations in
[`A10Y_AUDIT-2026-10-01.md`](A10Y_AUDIT-2026-10-01.md), progress in [`A10Y_REMEDIATIONS-2026-10-01.md`](A10Y_REMEDIATIONS-2026-10-01.md)):

- Keyboard focus is hardly visible on most controls.
- Several colours (primary buttons, secondary text, links, error messages, event chips) do not
  reach the required contrast ratio.
- The attendee contact card cannot be reached with the keyboard from within the event dialogs.
- Several form fields show no visible label (only a placeholder, their name is given to assistive
  technologies), and required fields are not visibly indicated.
- Some states (event participation status, privacy) are conveyed by colour or icon only, and
  calendar events are announced without their full time range and status.
- There is no skip link; the focus is not moved when switching between calendar, settings and
  search.
- Some messages disappear after 2 seconds.

### Derogations for disproportionate burden

None claimed.

### Content not subject to the accessibility obligation

None identified.

### Known limitations and alternatives

- **Drag and drop in the calendar grid** (creating, moving or resizing an event with the pointer):
  the same result is obtained with the keyboard through the *Create* button and the event form
  (dates, times, duration).
- **Arrow-key navigation inside the calendar grid** is not provided by the calendar component:
  events are reached with the Tab key, and the Schedule view lists them sequentially.
- **Calendar colours chosen by users** may not contrast enough: event status is (or will be) also
  conveyed as text.

Keyboard usage is documented in [`KEYBOARD.md`](KEYBOARD.md).

## Preparation of this statement

- Statement established on **2026-10-01**, updated on **2026-10-01**.
- Technologies used: HTML5, CSS, JavaScript (React, MUI, FullCalendar), WAI-ARIA.
- Pre-audit tools: source review, axe-core (via an automated accessibility scanner) on Chromium.
- Pages examined by the pre-audit: see the sample proposed in [`A10Y_REMEDIATIONS-2026-10-01.md`](A10Y_REMEDIATIONS-2026-10-01.md) (entry R-01).

## Feedback and contact

If you cannot access a content or a service, you can contact us so that we direct you to an
accessible alternative or provide the content in another form:

- open an issue labelled `accessibility` on
  <https://github.com/linagora/twake-calendar-frontend/issues/new?labels=accessibility>;
- *[deployer]*: add the accessibility contact of your service (e-mail address, form, postal address).

## Remedies

This procedure is to be used in the following case: you reported to the person responsible for the
service an accessibility defect that prevents you from accessing a content or a service, and you
did not obtain a satisfactory answer. You can:

- write a message to the Défenseur des droits: <https://formulaire.defenseurdesdroits.fr/>;
- contact the delegate of the Défenseur des droits in your region:
  <https://www.defenseurdesdroits.fr/carte-des-delegues>;
- send a letter (free of charge, no stamp needed):
  Défenseur des droits — Libre réponse 71120 — 75342 Paris CEDEX 07.

## For deployers

1. Copy this file (or its [French version](ACCESSIBILITY_STATEMENT-fr.md)) and [`MULTI_YEAR_PLAN.md`](MULTI_YEAR_PLAN.md) and complete the *[deployer]* sections.
2. Publish them on your website (French administrations publish the French version,
   [`ACCESSIBILITY_STATEMENT-fr.md`](ACCESSIBILITY_STATEMENT-fr.md)).
3. Once an RGAA audit of your deployment has been performed, update the compliance status and the
   audit results (date, auditor, sample, rate) in your copy.
