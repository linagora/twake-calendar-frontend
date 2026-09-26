# Twake Calendar Frontend — end to end tests

A regression net for the SPA: a real browser, driving the real production frontend images —
the private application and the public booking pages —
against a real backend (esn-sabre + twake-calendar-side-service + MongoDB, RabbitMQ,
OpenSearch, Redis, OpenLDAP) and a real OIDC provider (Dex). No mock, no stub.

Java + JUnit 5 + [Playwright](https://playwright.dev/java/) + Testcontainers.

---

## Running it

```bash
cd e2e
./pre-build.sh      # builds both SPA bundles and every docker image
mvn clean test
```

`pre-build.sh` reuses `apps/private/dist` when it is already there. Force a rebuild of the
bundle with `FORCE_FRONTEND_BUILD=true`. The repo needs Node 24+; when the local Node is
older (or absent) the script transparently builds the bundle in a `node:24` container.

Run a single class or a single test:

```bash
mvn test -Dtest=EventCreationTest
mvn test -Dtest=EventCreationTest#createdEventShowsUpInTheGrid
```

### Watching it work / debugging

| Variable | Effect |
|---|---|
| `E2E_HEADLESS=false` | Shows the browser |
| `E2E_SLOWMO=300` | Slows every action down by 300 ms |
| `E2E_TRACE=always` | Records a Playwright trace for every test, not only failures |

A failing test always leaves a full page screenshot and a trace under
`target/e2e-artifacts/<Class>/<method>/`. Replay one with:

```bash
npx playwright show-trace target/e2e-artifacts/EventCreationTest/createdEventShowsUpInTheGrid/trace.zip
```

Browser console errors and uncaught exceptions are printed in the maven output, prefixed
with `[browser console error]` / `[browser page error]`.

### The clock

A calendar behaves differently on a Sunday, on the last day of a month or at 23:50: a suite
reading the wall clock passes or fails depending on when it runs. So the suite does not read
it. `E2EClock` starts every test at a chosen instant, in the browsers and on the Java side
alike, and time flows normally from there:

| | Starts at |
|---|---|
| Any test | a Wednesday, 10:00 Europe/Paris, the one closest to the real date whose week lies whole within its month |
| `@ClockAt(day = LAST_OF_MONTH, time = "23:45")` | that edge, around the month boundary closest to the real date; also `FIRST_OF_MONTH` and `SUNDAY` |
| `E2E_NOW=2026-09-27T23:50` | that instant, for every test without `@ClockAt`: how a failure seen on another day is reproduced |

Every test prints the instant it starts at, and the `E2E_NOW` value reproducing the run.

In a test, "today" is `E2EClock.today()`, never `LocalDate.now()`; better still, read the
date off the grid (`calendar.firstVisibleDate()`, `anotherDayOfTheWeekOnScreen()`) and walk
to a day with `goToDate` rather than assume it is on screen.

Only the browsers and the tests are moved: the backend keeps the real clock, which is why the
chosen instants stay within a couple of weeks of the real date. Dates the tests write are
explicit, and `E2EClock.daysAheadOnBothClocks` gives a day in the future for both, for what
the server computes from its own clock -- bookable slots. The OIDC callback runs on the real
clock too, since it checks the tokens against it: the login therefore ends with a reload.

### What it costs

Measured on a developer laptop, 22 tests:

| | |
|---|---|
| `./pre-build.sh`, bundle already built | ~30 s |
| `mvn clean test`, whole suite | ~1 min 45 |
| Booting the docker stack, once per run | ~20 s, paid by the first test |
| **Marginal cost of one more test** | **~3 s** (median 3.1 s, range 1.9 s – 4.8 s) |

So a hundred tests would still run in well under ten minutes. Write them.

---

## What to write next

[`../e2e.md`](../e2e.md) is the backlog: 200 essential scenarios covering every basic
feature, then 318 bonus ones. Each line carries a stable identifier — quote it in the
`@DisplayName` so the backlog and the code stay connected — and a checkbox to tick once the
test is written **and** green.

Recurring events (`RECUR-*`, `RECUR-EDIT-*`, 50 scenarios) are the priority: that is where a
regression is both the likeliest and the most expensive, because a badly written exception
corrupts a whole series silently.

---

## Writing a test

```java
class MyFeatureTest extends TwakeCalendarE2ETest {

    @Test
    @DisplayName("Says what a user would say")
    void myScenario(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        calendar.createEvent().title("Sprint review").expand().location("Room 3").save();

        assertThat(probe.eventSummaries(user)).containsExactly("Sprint review");
    }
}
```

Declare what you need as a test method parameter:

| Parameter | What it is |
|---|---|
| `Page` | A Playwright page on a fresh browser context |
| `E2EUser` | A brand new account, created for this test and this test only |
| `E2EUserFactory` | More accounts, on demand, for multi user scenarios |
| `E2ESessions` | Additional logged in sessions: `sessions.openFor(guest)` returns their `CalendarPage` |
| `CalendarProbe` | Backend side view of a user's calendar (CalDAV), to seed fixtures and assert persistence |
| `BrowserContext` | The context, for cookies / storage / permissions |
| `TwakeCalendarStack` | The docker stack, for its URLs |

Page objects live in `com.linagora.calendar.e2e.pages`: `LoginPage`, `CalendarPage`,
`EventFormModal`, `EventPreviewPopover`, `SettingsPage`. Add methods there rather than
scattering locators across tests.

**Locate by accessible name**, not by CSS class. The app is built on MUI + emotion: class
names are generated and churn on every dependency bump, whereas `aria-label` and visible text
are part of what the user sees. `page.getByLabel("Create a new event")` survives a refactor,
`.css-foaupf` does not.

**Prefer `PlaywrightAssertions.assertThat(locator)`** over reading a value and asserting on it:
those assertions retry until the timeout, so they do not race the app's rendering.

---

## Isolation

The docker stack boots once for the whole run — it costs minutes — so **the user is the unit
of isolation**. Every test gets a brand new account, created milliseconds before it logs in;
its events, calendars and settings cannot leak into another test, and no test has to clean up
after itself.

Accounts are **not** a finite pool: Dex authenticates against the OpenLDAP of the stack, so
creating one is a single LDAP write. `E2EUserFactory` does it in about a millisecond, and
everything downstream follows on its own — the side service provisions the OpenPaaS user on
the first authenticated call, which provisions the default calendar. Nothing caps how many a
run may consume, and nothing has to be regenerated when the suite grows.

```java
void sharing(Page page, E2EUser owner, E2EUserFactory users, E2ESessions sessions) {
    E2EUser guest = users.newUser();          // a second account, right now
    CalendarPage theirs = sessions.openFor(guest);   // logged in, own browser context
    ...
}
```

Give a user a readable local part with `users.newUser("alice")` when a test asserts on what it
displays; a random suffix is appended to keep it unique.

Secondary sessions each get their own browser context, so cookies and tokens never bleed
between users, and they are closed when the test ends.

---

## How the addressing works

This is the one genuinely subtle part of the setup, and it is worth understanding before
touching the docker files.

The SPA reads its configuration at runtime from `.env.js`, which is baked into the image at
build time — long before docker has picked the host ports it will publish the stack on. So
instead of generating that file, the URLs are fixed and the **browser** is taught to resolve
them, through Chromium's `--host-resolver-rules`:

| The app talks to | Which really is |
|---|---|
| `http://localhost:8099` | the `frontend` container (nginx serving the production bundle) |
| `http://public` | the `public` container, the unauthenticated application: booking pages |
| `http://api` | the `proxy` container, in front of the side service, adding CORS |
| `http://dav` | the same proxy, in front of esn-sabre |
| `https://sso:5554` | Dex |

Containers reach each other by those very same names, so browser and backend agree on one
single set of URLs whatever ports docker picked. No `/etc/hosts` entry, no fixed host port, no
port clash between two concurrent runs, and the cross origin topology of a real deployment is
preserved — which is how CORS regressions get caught here rather than in production.

Two constraints shaped the details:

- The SPA is served as `http://localhost:8099` rather than `http://frontend` because the OIDC
  PKCE challenge goes through `crypto.subtle`, which browsers only expose to a *secure
  context*. A loopback origin qualifies; `http://frontend` would not. Nothing is bound on port
  8099 — it is a made up port the resolver rewrites.
- Dex serves **https** on 5554 because `openid-client` refuses to speak OIDC over plain http.
  The certificate is self signed and generated at image build time; the browser context is
  told to ignore it. The side service keeps using the plain http listener on 5556 from inside
  the network.

### Known limitation

Logging out sends the browser to Dex's end session endpoint, and Dex answers `Bad Request`
because the SPA does not pass an `id_token_hint`. `AuthenticationTest` therefore asserts the
hand-over to the SSO, not the effective session drop.

---

## Layout

```
e2e/
├── pre-build.sh                     builds both SPA bundles and all the docker images
├── docker/                          one Dockerfile per service, configuration baked in
└── src/test/
    ├── java/com/linagora/calendar/e2e/
    │   ├── TwakeCalendarE2ETest      base class every test extends
    │   ├── docker/                   the compose stack and the JUnit/Playwright wiring
    │   ├── pages/                    page objects
    │   ├── backend/                  users, CalDAV probe, iCalendar fixtures
    │   └── tests/                    the tests themselves
    └── resources/
        ├── docker-twake-calendar-e2e.yml
        ├── frontend/env.js           runtime configuration of the private SPA under test
        ├── frontend/env.public.js    runtime configuration of the public SPA under test
        ├── oidc/                     Dex configuration (LDAP connector, no static account)
        ├── nginx/                    the CORS reverse proxy
        └── twake-calendar-side-service-conf/
```

The backend half of the stack is a deliberate copy of
[twake-calendar-integration-tests](https://github.com/linagora/twake-calendar-integration-tests):
that project tests the DAV servers, this one tests the frontend, and neither should be able to
break the other by editing a shared file.

---

## CI

The `E2E` stage of the root `Jenkinsfile` runs the suite on every build. It reuses the bundle
produced by the `Compile` stage. Failure artifacts are archived on the build.
