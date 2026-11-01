package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Pattern;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.CalendarProbe;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.backend.Ical;
import com.linagora.calendar.e2e.docker.E2EClock;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.WebSocketRoute;
import com.microsoft.playwright.assertions.LocatorAssertions;
import com.microsoft.playwright.assertions.PlaywrightAssertions;

/**
 * Live update pushes the application has to survive. Only the side service writes them, so a
 * malformed one takes a side service bug -- which the suite cannot cause. The browser's socket is
 * therefore routed: what the page sends still reaches the side service, but the server's pushes
 * are swallowed and the test speaks in its place.
 */
class LivePushRobustnessTest extends TwakeCalendarE2ETest {
    private static final double REFRESHED_MS = 30_000;

    private final AtomicReference<WebSocketRoute> socket = new AtomicReference<>();

    private static String title(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    /** Signs in with the side service muted: only {@link #push} reaches the page. */
    private CalendarPage loginWithPushesInHand(Page page, E2EUser user) {
        page.routeWebSocket(Pattern.compile(".*"), route -> {
            WebSocketRoute server = route.connectToServer();
            server.onMessage(frame -> {
                // swallowed: the test is the server now
            });
            socket.set(route);
        });
        return LoginPage.loginAs(page, user).waitUntilLiveConnected();
    }

    private void push(String json) {
        assertThat(socket.get()).as("the page opened its live update socket").isNotNull();
        socket.get().send(json);
    }

    /**
     * Writes an event behind the page's back. With the server's pushes swallowed, it only shows
     * up once a push of the test names the calendar.
     */
    private Locator eventWrittenElsewhere(Page page, E2EUser user, CalendarProbe probe,
                                          CalendarPage calendar) {
        String title = title("Pushed");
        String uid = UUID.randomUUID().toString();
        probe.putEvent(user, uid, Ical.event(uid, title, E2EClock.today(), 9));
        page.waitForTimeout(3_000);
        PlaywrightAssertions.assertThat(calendar.eventCard(title))
            // the server's own push was swallowed: nothing refreshed the calendar yet
            .hasCount(0);
        return calendar.eventCard(title);
    }

    private static String calendarPath(CalendarProbe probe, E2EUser user) {
        return CalendarProbe.defaultCalendarNode(probe.requireOpenPaasId(user));
    }

    @Test
    @DisplayName("LIVE-ROBUST-01 (#1875) A null calendarList does not lose the rest of the push")
    void aNullCalendarListDoesNotLoseThePush(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = loginWithPushesInHand(page, user);
        Locator card = eventWrittenElsewhere(page, user, probe, calendar);

        // calendarList first: it used to throw before the calendar key was read
        push("{\"calendarList\":null,\"" + calendarPath(probe, user) + "\":{}}");

        PlaywrightAssertions.assertThat(card.first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(REFRESHED_MS));
    }

    @Test
    @DisplayName("LIVE-ROBUST-02 (#1876) A non string entry among the registered calendars does not lose the push")
    void aNonStringRegisteredEntryDoesNotLoseThePush(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = loginWithPushesInHand(page, user);
        Locator card = eventWrittenElsewhere(page, user, probe, calendar);

        push("{\"registered\":[[\"/calendars/a/a\"],42,{\"toString\":{}},\""
            + calendarPath(probe, user) + "\"]}");

        PlaywrightAssertions.assertThat(card.first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(REFRESHED_MS));
    }

    @Test
    @DisplayName("LIVE-ROBUST-03 (#1877) An import outcome never shows a fractional or negative count")
    void anImportOutcomeShowsNoImpossibleCount(Page page, E2EUser user, CalendarProbe probe) {
        loginWithPushesInHand(page, user);

        push("{\"" + calendarPath(probe, user) + "\":{\"imports\":{\"" + UUID.randomUUID()
            + "\":{\"status\":\"completed\",\"succeedCount\":2.5,\"failedCount\":-1}}}}");

        Locator toast = page.getByText("Your import completed").first();
        PlaywrightAssertions.assertThat(toast)
            .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(REFRESHED_MS));
        assertThat(toast.innerText())
            .as("a count is a whole number of events, never 2.5 nor -1")
            .doesNotContain("2.5")
            .doesNotContain("-1");
    }
}
