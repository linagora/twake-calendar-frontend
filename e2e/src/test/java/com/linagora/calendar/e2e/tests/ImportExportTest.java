package com.linagora.calendar.e2e.tests;

import static com.linagora.calendar.e2e.backend.Ics.fixture;
import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;
import java.util.UUID;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.CalendarProbe;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.backend.Ics;
import com.linagora.calendar.e2e.docker.E2EClock;
import com.linagora.calendar.e2e.pages.CalendarModal;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.LocatorAssertions;
import com.microsoft.playwright.assertions.PlaywrightAssertions;
import com.microsoft.playwright.options.AriaRole;

/**
 * Getting events in and out: the Import tab, the export button, and the two addresses the
 * Access tab publishes -- the CalDAV one and the secret one.
 *
 * <p>An import is asserted on CalDAV rather than on the grid: what matters is the iCalendar that
 * ends up on the server, rules and exceptions included, not the handful of cards a week happens
 * to show.
 */
class ImportExportTest extends TwakeCalendarE2ETest {
    private static final String OWN_CALENDAR = "My calendar";
    private static final Duration IMPORT_MS = Duration.ofSeconds(60);

    private CalendarModal importTab(CalendarPage calendar) {
        return calendar.modifyCalendar(OWN_CALENDAR).tab("Import");
    }

    private void importInto(CalendarPage calendar, String file) {
        importTab(calendar).importFile(fixture(file)).startImport();
    }

    /** Fetches an address the interface published, without any browser involved. */
    private HttpResponse<String> fetch(String url, String basicAuth) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url.replace("http://dav", davFromInside())
                    .replace("http://api", apiFromInside())))
                .timeout(Duration.ofSeconds(30));
            if (basicAuth != null) {
                builder.header("Authorization", "Basic " + Base64.getEncoder()
                    .encodeToString(basicAuth.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
            }
            return HttpClient.newHttpClient().send(builder.build(),
                HttpResponse.BodyHandlers.ofString());
        } catch (Exception e) {
            throw new RuntimeException("Could not reach " + url, e);
        }
    }

    private String davFromInside() {
        return com.linagora.calendar.e2e.docker.TwakeCalendarStack.singleton().davUri();
    }

    private String apiFromInside() {
        return com.linagora.calendar.e2e.docker.TwakeCalendarStack.singleton()
            .url(com.linagora.calendar.e2e.docker.TwakeCalendarStack.Service.SIDE_SERVICE, "http");
    }

    @Test
    @DisplayName("IMPEX-01 Importing a file adds its events to the calendar")
    void importingAFileAddsItsEvents(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        importInto(calendar, "simple.ics");

        Awaitility.await().atMost(IMPORT_MS).untilAsserted(() ->
            assertThat(probe.eventSummaries(user))
                .contains("Imported simple one", "Imported simple two"));
    }

    @Test
    @DisplayName("IMPEX-03 An imported recurrence keeps its rule")
    void anImportedRecurrenceKeepsItsRule(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        importInto(calendar, "recurring.ics");

        Awaitility.await().atMost(IMPORT_MS).untilAsserted(() -> {
            assertThat(probe.rawEvents(user)).isNotEmpty();
            String master = Ics.master(probe.singleEvent(user));
            assertThat(Ics.property(master, "RRULE").orElseThrow())
                .contains("FREQ=WEEKLY")
                .contains("COUNT=6");
        });
    }

    @Test
    @DisplayName("IMPEX-04 An imported exception keeps its RECURRENCE-ID")
    void anImportedExceptionKeepsItsRecurrenceId(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        importInto(calendar, "recurring.ics");

        Awaitility.await().atMost(IMPORT_MS).untilAsserted(() -> {
            assertThat(probe.rawEvents(user)).isNotEmpty();
            assertThat(Ics.overrides(probe.singleEvent(user)))
                .as("the moved occurrence is an exception of the series, not a separate event")
                .hasSize(1);
        });
    }

    @Test
    @DisplayName("IMPEX-05 A file that is not iCalendar is refused")
    void aFileThatIsNotICalendarIsRefused(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        importInto(calendar, "broken.ics");

        page.waitForTimeout(5000);
        assertThat(probe.rawEvents(user))
            .as("nothing of a file the product cannot read belongs in the calendar")
            .isEmpty();
    }

    @Test
    @DisplayName("IMPEX-06 An empty file adds nothing")
    void anEmptyFileAddsNothing(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        importInto(calendar, "empty.ics");

        page.waitForTimeout(5000);
        assertThat(probe.rawEvents(user)).isEmpty();
    }

    @Test
    @DisplayName("IMPEX-09 Importing the same file twice does not duplicate anything")
    void importingTwiceDoesNotDuplicate(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        importInto(calendar, "simple.ics");
        Awaitility.await().atMost(IMPORT_MS).untilAsserted(() ->
            assertThat(probe.eventSummaries(user)).hasSize(2));

        importInto(calendar, "simple.ics");

        page.waitForTimeout(8000);
        assertThat(probe.eventSummaries(user))
            .as("the same events, carrying the same identifiers, are the same events")
            .containsExactlyInAnyOrder("Imported simple one", "Imported simple two");
    }

    @Test
    @DisplayName("IMPEX-10 The import writes into the calendar it was told to")
    void theImportWritesIntoTheChosenCalendar(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String other = "Imports " + UUID.randomUUID().toString().substring(0, 6);
        calendar.addCalendar().name(other).create();
        calendar.showCalendar(other);

        importTab(calendar).importFile(fixture("simple.ics")).importTo(other).startImport();

        // read the destination back through its own export: the imported dates are fixed and
        // need not fall in the week the grid happens to show
        Awaitility.await().atMost(IMPORT_MS).untilAsserted(() -> {
            CalendarModal destination = calendar.modifyCalendar(other).tab("Access");
            String exported = destination.exportCalendar();
            destination.close();
            assertThat(Ics.unfold(exported)).contains("SUMMARY:Imported simple one");
        });
        assertThat(probe.eventSummaries(user))
            .as("the default calendar was not the destination and must stay untouched")
            .doesNotContain("Imported simple one");
    }

    @Test
    @DisplayName("IMPEX-11 Exporting a calendar hands back all of its events")
    void exportingHandsBackAllTheEvents(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = "Exported " + UUID.randomUUID().toString().substring(0, 8);
        calendar.createEvent(title);

        String exported = calendar.modifyCalendar(OWN_CALENDAR).tab("Access").exportCalendar();

        assertThat(exported).contains("BEGIN:VCALENDAR").contains("END:VCALENDAR");
        assertThat(Ics.unfold(exported)).contains("SUMMARY:" + title);
    }

    @Test
    @DisplayName("IMPEX-12 Exporting an empty calendar still produces a valid file")
    void exportingAnEmptyCalendarProducesAValidFile(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String empty = "Empty " + UUID.randomUUID().toString().substring(0, 6);
        calendar.addCalendar().name(empty).create();

        String exported = calendar.modifyCalendar(empty).tab("Access").exportCalendar();

        assertThat(exported).contains("BEGIN:VCALENDAR").contains("END:VCALENDAR");
        assertThat(exported).doesNotContain("BEGIN:VEVENT");
    }

    @Test
    @DisplayName("IMPEX-13 The published CalDAV address answers an authenticated request")
    void thePublishedCaldavAddressAnswers(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = "Reachable " + UUID.randomUUID().toString().substring(0, 8);
        calendar.createEvent(title);

        String url = calendar.modifyCalendar(OWN_CALENDAR).tab("Access").caldavUrl();

        assertThat(url).contains("/calendars/");
        HttpResponse<String> response = fetch(url, "admin&" + user.email() + ":secret123");
        assertThat(response.statusCode())
            .as("the address the interface publishes has to be usable, it is its whole point")
            .isBetween(200, 299);
    }

    @Test
    @DisplayName("IMPEX-14 The secret address opens the calendar without credentials")
    void theSecretAddressOpensTheCalendar(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = "Secretly readable " + UUID.randomUUID().toString().substring(0, 8);
        calendar.createEvent(title);

        String secret = calendar.modifyCalendar(OWN_CALENDAR).tab("Access").secretUrl();

        assertThat(secret).contains("token=");
        HttpResponse<String> response = fetch(secret, null);
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(Ics.unfold(response.body())).contains("SUMMARY:" + title);
    }

    @Test
    @DisplayName("IMPEX-15 Resetting the secret address retires the previous one")
    void resettingTheSecretAddressRetiresTheOldOne(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        calendar.createEvent("Behind a token " + UUID.randomUUID().toString().substring(0, 8));
        CalendarModal modal = calendar.modifyCalendar(OWN_CALENDAR).tab("Access");
        String before = modal.secretUrl();
        assertThat(fetch(before, null).statusCode()).isEqualTo(200);

        modal.resetSecretUrl();
        String after = modal.secretUrl();

        assertThat(after).isNotEqualTo(before);
        assertThat(fetch(after, null).statusCode()).isEqualTo(200);
        assertThat(fetch(before, null).statusCode())
            .as("an address that was reset must stop opening the calendar")
            .isNotEqualTo(200);
    }

    @Test
    @DisplayName("IMPEX-16 An event written by a CalDAV client shows in the interface")
    void anEventWrittenByACaldavClientShows(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user).waitUntilLiveConnected();
        String uid = UUID.randomUUID().toString();
        String title = "From a third party client " + uid.substring(0, 8);

        probe.putEvent(user, uid, com.linagora.calendar.e2e.backend.Ical.event(
            uid, title, E2EClock.today(), 11));

        com.microsoft.playwright.assertions.PlaywrightAssertions
            .assertThat(calendar.eventCard(title).first())
            .isAttached(new com.microsoft.playwright.assertions.LocatorAssertions
                .IsAttachedOptions().setTimeout(60_000));
    }

    @Test
    @DisplayName("IMPEX-17 An imported event in a far away timezone reads at the right hour")
    void anImportedEventInAFarAwayTimezoneReadsRight(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        importInto(calendar, "exotic-timezone.ics");

        Awaitility.await().atMost(IMPORT_MS).untilAsserted(() ->
            assertThat(probe.eventSummaries(user)).contains("Imported from Chatham"));
        String event = Ics.event(probe.singleEvent(user));
        assertThat(Ics.property(event, "DTSTART").orElseThrow())
            .as("the instant is what has to survive the import, whatever zone it is written in")
            .contains("20260915");
    }

    @Test
    @DisplayName("IMPEX-20 An exported recurring event carries its whole rule")
    void anExportedRecurringEventCarriesItsRule(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        importInto(calendar, "recurring.ics");
        Awaitility.await().atMost(IMPORT_MS).untilAsserted(() ->
            assertThat(probe.eventSummaries(user)).contains("Imported weekly series"));

        String exported = Ics.unfold(
            calendar.modifyCalendar(OWN_CALENDAR).tab("Access").exportCalendar());

        assertThat(exported).contains("RRULE:").contains("FREQ=WEEKLY").contains("COUNT=6");
        assertThat(exported)
            .as("an export that loses the exceptions is not a backup")
            .contains("RECURRENCE-ID");
    }

    @Test
    @DisplayName("IMPEX-21 A completed import is announced with its counts")
    void aCompletedImportIsAnnounced(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user).waitUntilLiveConnected();

        importInto(calendar, "simple.ics");

        PlaywrightAssertions.assertThat(page.getByRole(AriaRole.ALERT)
                .filter(new Locator.FilterOptions().setHasText("Your import completed")))
            .containsText("2 item(s) imported, 0 error(s)",
                new LocatorAssertions.ContainsTextOptions().setTimeout(IMPORT_MS.toMillis()));
    }
}
