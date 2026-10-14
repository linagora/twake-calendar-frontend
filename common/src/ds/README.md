# `@common/ds/`: the local design system

UI that Twake Calendar needs and that `@linagora/twake-mui` does not provide,
or provides with a look the calendar does not want yet. Import it with the
`@common/ds/` alias (`import { Dialog } from '@common/ds/Dialog/Dialog'`),
from `apps/` as well as from `common/`.

Everything here is meant to move to [twake-ui](https://github.com/linagora/twake-ui)
one day, or to disappear when the calendar adopts what twake-mui offers: keep
it generic.

## Rules

- **UI only, no business logic.** No store, no API, no routing, no
  translations: labels and values arrive as props.
- **Raw MUI is allowed here, and only here** (`@mui/material`). Prefer what
  `@linagora/twake-mui` re-exports and the theme values over hard-coded ones.
- **Compose, do not fork.** When a twake-mui component almost fits, wrap it
  (see `Avatar`) rather than copying its code.
- **One folder per component**: `ds/<Component>/<Component>.tsx`, a colocated
  `<Component>.test.tsx` when it holds logic, and a header comment saying
  whether it should go upstream to twake-ui, and why.
- Named exports and explicit types.

## The twake-mui 5.1.1 look

`ThemeProvider` and `Avatar`, `Dialog`, `ListItemText` and `Switch` keep the
calendar as it was with twake-mui 5.1.1 while it runs twake-mui 13. To adopt
the twake-mui 13 look of a component, delete its entry in
`ThemeProvider/legacyOverrides.tsx` (or its folder here) and check the
screens that use it.
