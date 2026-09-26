package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.CalendarProbe;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.backend.Ical;
import com.linagora.calendar.e2e.docker.E2EClock;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.LocatorAssertions;
import com.microsoft.playwright.assertions.PlaywrightAssertions;

/**
 * What the SPA does with changes it did not initiate: the websocket live updates and the
 * manual refresh. Both are frequent regression spots and invisible to unit tests.
 *
 * <p>The waits here are generous on purpose. A live delivery travels through Sabre, RabbitMQ,
 * the side service and the socket before anything is painted, and the suite runs four classes
 * against one backend: what takes a second alone can take half a minute under that load.
 */
class BackendSyncTest extends TwakeCalendarE2ETest {
    /** How long a change may take to travel from CalDAV to the screen. */
    private static final double LIVE_DELIVERY_MS = 60_000;


    @Test
    @DisplayName("SYNC-01 An event written on CalDAV pops up in the grid without a reload")
    void eventCreatedOnCalDavShowsUpLive(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user).waitUntilLiveConnected();
        String title = "Pushed live " + UUID.randomUUID().toString().substring(0, 8);

        probe.putEvent(user, UUID.randomUUID().toString(), Ical.event(
            UUID.randomUUID().toString(), title, E2EClock.today(), 9));

        PlaywrightAssertions.assertThat(calendar.eventCard(title).first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(LIVE_DELIVERY_MS));
    }

    @Test
    @DisplayName("SYNC-02 An event deleted on CalDAV is gone after a refresh")
    void eventDeletedOnCalDavDisappearsAfterRefresh(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user).waitUntilLiveConnected();
        String title = "Deleted behind your back " + UUID.randomUUID().toString().substring(0, 8);
        String uid = UUID.randomUUID().toString();
        probe.putEvent(user, uid, Ical.event(uid, title, E2EClock.today(), 10));
        calendar.eventCard(title).first().waitFor();

        probe.deleteEvent(user, uid);
        calendar.refresh();

        PlaywrightAssertions.assertThat(calendar.eventCard(title))
            .hasCount(0, new LocatorAssertions.HasCountOptions().setTimeout(LIVE_DELIVERY_MS));
    }

    @Test
    @DisplayName("SYNC-03 Browsing to another week loads the events of that week")
    void eventsOfAnotherWeekAreLoadedWhenNavigating(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = "Next week " + UUID.randomUUID().toString().substring(0, 8);
        String uid = UUID.randomUUID().toString();
        probe.putEvent(user, uid, Ical.event(uid, title, E2EClock.today().plusWeeks(1), 9));
        // Reload so that the SPA starts from a clean slate and really has to fetch the range
        page.reload();
        calendar.waitUntilLoaded();

        assertThat(calendar.eventTitles()).doesNotContain(title);
        calendar.next();

        PlaywrightAssertions.assertThat(calendar.eventCard(title).first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(LIVE_DELIVERY_MS));
    }
}
