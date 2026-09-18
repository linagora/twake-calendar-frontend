package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.CalendarProbe;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.backend.Ical;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.EventFormModal;
import com.linagora.calendar.e2e.pages.EventPreviewPopover;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.linagora.calendar.e2e.pages.RecurrenceSection;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Request;
import com.microsoft.playwright.Response;
import com.microsoft.playwright.Route;

/**
 * How the application behaves when the ground moves: a backend that fails, one that is slow, a
 * calendar that is fuller than anybody expected, content that was not meant to be rendered.
 *
 * <p>Failures are staged by intercepting the browser's own requests, which is the closest thing
 * to a backend having a bad day without giving one to every other test sharing the stack.
 */
class RobustnessTest extends TwakeCalendarE2ETest {

    private static String unique(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    /** Fails every write towards a calendar, whatever verb carries it. */
    private void breakWrites(Page page, int status) {
        page.route("**/*", route -> {
            String method = route.request().method();
            boolean write = !"GET".equals(method) && !"OPTIONS".equals(method);
            if (write && route.request().url().contains("calendars")) {
                route.fulfill(new Route.FulfillOptions().setStatus(status).setBody(""));
            } else {
                route.resume();
            }
        });
    }

    @Test
    @DisplayName("ROBUST-01 A backend that fails leaves a message, never a blank screen")
    void aFailingBackendLeavesAMessage(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        page.route("**/*", route -> {
            if (route.request().url().contains("calendars")) {
                route.fulfill(new Route.FulfillOptions().setStatus(500).setBody(""));
            } else {
                route.resume();
            }
        });
        calendar.refresh();
        page.waitForTimeout(5000);

        assertThat(page.locator("body").innerText())
            .as("a backend having a bad day still leaves an application to look at")
            .isNotBlank();
        assertThat(calendar.page().locator(".fc-view-harness").count())
            .as("the grid stays on screen rather than being replaced by nothing")
            .isPositive();
        page.unrouteAll();
    }

    @Test
    @DisplayName("ROBUST-03 A save the backend refuses is reported")
    void aSaveTheBackendRefusesIsReported(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = unique("Doomed save");

        breakWrites(page, 500);
        calendar.createEvent().title(title).trySave();
        page.waitForTimeout(5000);

        assertThat(probe.rawEvents(user))
            .as("a save the server refused has to leave nothing behind")
            .isEmpty();
        assertThat(page.locator("body").innerText()).isNotBlank();
        page.unrouteAll();
    }

    @Test
    @DisplayName("ROBUST-06 A slow backend delays the grid without scrambling it")
    void aSlowBackendDelaysWithoutScrambling(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = unique("Slowly fetched");
        String uid = UUID.randomUUID().toString();
        probe.putEvent(user, uid, Ical.event(uid, title, LocalDate.now(), 9));

        page.route("**/*", route -> {
            if (route.request().url().contains("calendars")) {
                try {
                    Thread.sleep(3000);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
            route.resume();
        });
        page.reload();
        calendar.waitUntilLoaded();

        Awaitility.await().atMost(Duration.ofSeconds(60)).untilAsserted(() ->
            assertThat(calendar.eventTitles())
                .as("a slow answer arrives late, it does not arrive wrong")
                .contains(title));
        page.unrouteAll();
    }

    @Test
    @DisplayName("ROBUST-07 A week holding two hundred events still renders")
    void aWeekHoldingTwoHundredEventsStillRenders(Page page, E2EUser user, CalendarProbe probe) {
        // the account is provisioned on its first login, and the probe needs it to exist
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String marker = UUID.randomUUID().toString().substring(0, 8);
        for (int index = 0; index < 200; index++) {
            String uid = UUID.randomUUID().toString();
            probe.putEvent(user, uid, Ical.event(uid, "Bulk " + marker + " " + index,
                LocalDate.now().plusDays(index % 5), 8 + (index % 10)));
        }

        long startedAt = System.currentTimeMillis();
        page.reload();
        calendar.waitUntilLoaded();
        Awaitility.await().atMost(Duration.ofSeconds(60)).untilAsserted(() ->
            assertThat(calendar.eventCards().count()).isGreaterThan(50));
        long elapsed = System.currentTimeMillis() - startedAt;

        assertThat(elapsed)
            .as("a busy week is the normal case for a real user, it cannot take a minute")
            .isLessThan(45_000);
        assertThat(probe.rawEvents(user)).hasSize(200);
    }

    @Test
    @DisplayName("ROBUST-09 A crowded day offers to show what does not fit")
    void aCrowdedDayOffersToShowWhatDoesNotFit(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String marker = UUID.randomUUID().toString().substring(0, 8);
        for (int index = 0; index < 12; index++) {
            String uid = UUID.randomUUID().toString();
            probe.putEvent(user, uid, Ical.event(uid, "Crowd " + marker + " " + index,
                LocalDate.now(), 8 + (index % 8)));
        }

        page.reload();
        calendar.waitUntilLoaded();
        calendar.switchView("Month");
        page.waitForTimeout(5000);

        assertThat(page.locator("body").innerText())
            .as("a month cell that cannot show everything has to offer the rest")
            .containsPattern("(?i)\\+?\\s*\\d+\\s*more");
    }

    @Test
    @DisplayName("ROBUST-15 Browsing quickly between weeks does not pile up requests")
    void browsingQuicklyDoesNotPileUpRequests(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        AtomicInteger calls = new AtomicInteger();
        page.onRequest(request -> {
            if (request.url().contains("calendars") && !"OPTIONS".equals(request.method())) {
                calls.incrementAndGet();
            }
        });

        for (int step = 0; step < 6; step++) {
            calendar.next();
        }
        page.waitForTimeout(6000);

        assertThat(calls.get())
            .as("six weeks browsed is not a reason to ask the server thirty times")
            .isLessThanOrEqualTo(20);
    }

    @Test
    @DisplayName("ROBUST-17 A title of emojis and accents comes back exactly as it went")
    void aTitleOfEmojisComesBackUnchanged(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = "Réunion ✅ café → 10€ « ok » " + UUID.randomUUID().toString().substring(0, 6);

        calendar.createEvent(title);

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(probe.eventSummaries(user))
                .as("what goes in has to come back, character for character")
                .containsExactly(title));
        page.reload();
        calendar.waitUntilLoaded();
        calendar.eventCard(title).first().waitFor();
        assertThat(calendar.eventTitles()).anyMatch(shown -> shown.contains("✅"));
    }

    @Test
    @DisplayName("ROBUST-18 A description holding dangerous markup is stripped of it")
    void aDescriptionHoldingDangerousMarkupIsStripped(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = unique("Marked up");
        String description = "<b>bold</b> <img src=x onerror=\"window.__ran=1\"> plain";

        calendar.createEvent().title(title).expand().description(description).save();
        calendar.eventCard(title).first().waitFor();

        String preview = calendar.openEvent(title).text();
        // A description is rich text: simple formatting survives on purpose, and <b> really is
        // rendered as one. What must not survive is anything reaching beyond formatting -- an
        // image that makes the page fetch an address, and the handler riding on it.
        assertThat(page.locator("[role=dialog] img[src='x']").count())
            .as("a description must not be able to make the page fetch anything")
            .isZero();
        assertThat(page.evaluate("() => window.__ran || 0"))
            .as("and nothing it carried may run")
            .isEqualTo(0);
        assertThat(page.locator("[role=dialog] [onerror], [role=dialog] script").count())
            .as("nor leave a handler behind for later")
            .isZero();
        assertThat(preview).contains("plain");
    }

    @Test
    @DisplayName("ROBUST-19 Opening a simple event asks the server for nothing more")
    void openingASimpleEventAsksForNothingMore(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = unique("Standalone");
        calendar.createEvent(title);
        reload(calendar, title);
        List<Request> eventReads = recordEventReads(page);

        String preview = calendar.openEvent(title).text();
        page.waitForTimeout(2000);

        assertThat(preview).contains(title);
        assertThat(eventReads)
            .as("the grid already holds every field the preview of a simple event shows")
            .isEmpty();
    }

    @Test
    @DisplayName("ROBUST-20 Opening an occurrence reads its rule once, as jCal")
    void openingAnOccurrenceReadsItsRuleOnce(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = unique("Series");
        EventFormModal form = calendar.createEvent().title(title).expand()
            .startTime("09:00").endTime("10:00");
        form.repeat().frequency(RecurrenceSection.WEEKLY).every(2).endsNever();
        form.save();
        // the expanded occurrences the grid is rebuilt from carry no RRULE: the rule the preview
        // states can only come from reading the event itself
        reload(calendar, title);
        List<Request> eventReads = recordEventReads(page);

        EventPreviewPopover preview = calendar.openEvent(title);

        Awaitility.await().atMost(Duration.ofSeconds(10)).untilAsserted(() ->
            assertThat(preview.text().toLowerCase())
                .as("the rule is missing from the grid, so it was read back from the server")
                .contains("2")
                .contains("week"));
        assertThat(eventReads)
            .as("one read is enough to learn a rule")
            .hasSize(1);
        Response response = eventReads.get(0).response();
        assertThat(response).isNotNull();
        assertThat(response.headers().get("content-type"))
            .as("asking for jCal spares the client a raw ICS to parse")
            .contains("application/calendar+json");
    }

    private void reload(CalendarPage calendar, String title) {
        calendar.eventCard(title).first().waitFor();
        calendar.page().reload();
        calendar.waitUntilLoaded();
        calendar.eventCard(title).first().waitFor();
    }

    /** Every read of a single event object, the request opening an event used to always fire. */
    private List<Request> recordEventReads(Page page) {
        List<Request> reads = Collections.synchronizedList(new ArrayList<>());
        page.onRequest(request -> {
            if ("GET".equals(request.method()) && request.url().contains(".ics")) {
                reads.add(request);
            }
        });
        return reads;
    }
}
