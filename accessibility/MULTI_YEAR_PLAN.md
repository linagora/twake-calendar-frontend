# Multi-year accessibility plan — Twake Calendar (2026–2029)

*Schéma pluriannuel de mise en accessibilité*, as required by article 47 of French law n° 2005-102
and decree n° 2019-768. Covers the Twake Calendar web application developed in this repository.
Administrations deploying Twake Calendar complete it with their own organisation *[deployer]*.

## 1. Current situation

- **Compliance status**: not compliant — no RGAA audit performed yet.
- **Pre-audit** (2026-10-01): [`A10Y_AUDIT-2026-10-01.md`](A10Y_AUDIT-2026-10-01.md) — 17 blockers, 44 major and 31
  minor findings, and missing legal prerequisites.
- **Statement**: [English](ACCESSIBILITY_STATEMENT-en.md), [français](ACCESSIBILITY_STATEMENT-fr.md).

## 2. Organisation

| Role | Responsibility |
|---|---|
| Accessibility owner (LINAGORA, Twake Calendar product team) | Maintains this plan, the statement and the annual action plan; arbitrates priorities |
| Front-end developers | Implement remediations; keep the automated accessibility checks green |
| Design | Validates every remediation that changes the visible interface (colours, focus indicator, labels, new elements) |
| QA | Runs keyboard and screen-reader checks before each release |
| *[deployer]* Referent of the administration | Publishes the statement of the service, handles user feedback, commissions the RGAA audit |

## 3. Means

- Accessibility is part of the definition of done: no new screen ships with a known blocker.
- Automated regression net: lint rules (`eslint-plugin-jsx-a11y`) and axe checks in the
  end-to-end suite (see action R-17 of the action plan).
- Training: RGAA and keyboard / screen-reader testing for the front-end team in year 1.
- External RGAA audit by an independent auditor once the blockers are removed.
- User feedback channel: issues labelled `accessibility` on the public repository.

## 4. Roadmap

| Year | Objectives |
|---|---|
| **Year 1 (2026–2027)** | Legal prerequisites published (statement, plan, contact). Changes without visual impact delivered (ARIA names, semantics, keyboard operation). Design validation of the visual changes (focus indicator, colour palette, visible labels and required-field indicators, skip link, accessibility mention in the interface) and their delivery. Automated checks in CI. First external RGAA audit — target: **partially compliant (≥ 50 %)**. |
| **Year 2 (2027–2028)** | Remaining major findings (event accessible names, focus management, reflow, print and Schedule view semantics). Second audit — target: high partial compliance. |
| **Year 3 (2028–2029)** | Remaining minor findings, documented derogations reviewed. Target: **totally compliant** on the audited sample, kept by the regression net. |

## 5. Annual action plan

The action plan of the current year, ranked by return on investment and with the validation status
of each action, is [`A10Y_REMEDIATIONS-2026-10-01.md`](A10Y_REMEDIATIONS-2026-10-01.md). It is reviewed at each release.
