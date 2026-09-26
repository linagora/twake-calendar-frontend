package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.LocalDate;
import java.util.UUID;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.CalendarProbe;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.backend.E2EUserFactory;
import com.linagora.calendar.e2e.backend.Ical;
import com.linagora.calendar.e2e.docker.E2EClock;
import com.linagora.calendar.e2e.docker.E2ESessions;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.LocatorAssertions;
import com.microsoft.playwright.assertions.PlaywrightAssertions;
import com.microsoft.playwright.options.WaitForSelectorState;

/** What the calendar does with changes it did not make itself. */
class LiveUpdatesTest extends TwakeCalendarE2ETest {

    private void awaitAttached(Locator locator) {
        locator.first().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.ATTACHED));
    }

    private static String unique(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    @Test
    @DisplayName("SYNC-04 An event renamed over CalDAV changes title live")
    void aRenamedEventChangesTitleLive(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user).waitUntilLiveConnected();
        String before = unique("Before");
        String uid = UUID.randomUUID().toString();
        probe.putEvent(user, uid, Ical.event(uid, before, E2EClock.today(), 9));
        // the subject here is the live *rename*: get the starting state on screen the reliable
        // way, so a slow first delivery cannot be mistaken for a broken update
        page.reload();
        calendar.waitUntilLoaded();
        awaitAttached(calendar.eventCard(before));

        String after = unique("After");
        probe.putEvent(user, uid, Ical.event(uid, after, E2EClock.today(), 9));

        PlaywrightAssertions.assertThat(calendar.eventCard(after).first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(60_000));
        PlaywrightAssertions.assertThat(calendar.eventCard(before)).hasCount(0);
    }

    @Test
    @DisplayName("SYNC-05 An event moved over CalDAV changes slot live")
    void aMovedEventChangesSlotLive(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user).waitUntilLiveConnected();
        String title = unique("Moving");
        String uid = UUID.randomUUID().toString();
        // two days of the week on screen, whatever day it is: from a Sunday, tomorrow is not on it
        LocalDate from = calendar.firstVisibleDate();
        LocalDate to = from.plusDays(1);
        probe.putEvent(user, uid, Ical.event(uid, title, from, 9));
        page.reload();
        calendar.waitUntilLoaded();
        awaitAttached(calendar.eventCard(title));

        probe.putEvent(user, uid, Ical.event(uid, title, to, 9));

        Awaitility.await().atMost(Duration.ofSeconds(45)).untilAsserted(() ->
            assertThat(calendar.eventDates(title)).containsExactly(to.toString()));
    }

    @Test
    @DisplayName("SYNC-06 An incoming invitation shows up live in the guest's calendar")
    void anInvitationShowsUpLive(Page page, E2EUser organizer, E2EUserFactory users,
                                 E2ESessions sessions) {
        E2EUser guest = users.newUser();
        CalendarPage guestCalendar = sessions.openFor(guest).waitUntilLiveConnected();
        CalendarPage calendar = LoginPage.loginAs(page, organizer).waitUntilLiveConnected();
        String title = unique("Live invitation");

        calendar.createEvent().title(title).addGuest(guest.email()).save();

        PlaywrightAssertions.assertThat(guestCalendar.eventCard(title).first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(60_000));
    }

    @Test
    @DisplayName("SYNC-07 A guest's answer reaches the organizer live")
    void anAnswerReachesTheOrganizerLive(Page page, E2EUser organizer, E2EUserFactory users,
                                         E2ESessions sessions, CalendarProbe probe) {
        E2EUser guest = users.newUser();
        CalendarPage guestCalendar = sessions.openFor(guest).waitUntilLiveConnected();
        CalendarPage calendar = LoginPage.loginAs(page, organizer).waitUntilLiveConnected();
        String title = unique("Awaiting an answer");
        calendar.createEvent().title(title).addGuest(guest.email()).save();
        awaitAttached(calendar.eventCard(title));

        guestCalendar.page().reload();
        guestCalendar.waitUntilLoaded();
        awaitAttached(guestCalendar.eventCard(title));
        guestCalendar.openEvent(title).answer("Yes");

        // the answer must reach the organizer without them reloading anything
        Awaitility.await().atMost(Duration.ofSeconds(60)).untilAsserted(() ->
            assertThat(probe.singleEvent(organizer)).contains("PARTSTAT=ACCEPTED"));
        assertThat(calendar.openEvent(title).text())
            .as("the organizer's own page still shows the event, updated in place")
            .contains(title)
            .contains("2 participants");
    }

    @Test
    @DisplayName("SYNC-10 A change made while offline is picked up once back online")
    void aChangeMadeOfflineIsPickedUpOnReconnection(Page page, E2EUser user, BrowserContext context,
                                                    CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user).waitUntilLiveConnected();
        String title = unique("Written in the dark");

        context.setOffline(true);
        page.waitForTimeout(2000);
        String uid = UUID.randomUUID().toString();
        probe.putEvent(user, uid, Ical.event(uid, title, E2EClock.today(), 9));
        page.waitForTimeout(2000);
        context.setOffline(false);
        calendar.refresh();

        PlaywrightAssertions.assertThat(calendar.eventCard(title).first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(60_000));
    }

    @Test
    @DisplayName("SYNC-11 Two tabs of the same user stay in sync")
    void twoTabsStayInSync(Page page, E2EUser user, E2ESessions sessions) {
        CalendarPage first = LoginPage.loginAs(page, user).waitUntilLiveConnected();
        CalendarPage second = sessions.openFor(user).waitUntilLiveConnected();
        String title = unique("Two tabs");

        first.createEvent(title);

        PlaywrightAssertions.assertThat(second.eventCard(title).first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(60_000));
    }

    @Test
    @DisplayName("SYNC-12 A manual refresh catches up on an event the websocket missed")
    void aManualRefreshCatchesUp(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user).waitUntilLiveConnected();
        String title = unique("Missed");
        // the socket never learns about it: the page is not listening while it is being blocked
        page.route("**/ws**", route -> route.abort());
        page.reload();
        calendar.waitUntilLoaded();

        String uid = UUID.randomUUID().toString();
        probe.putEvent(user, uid, Ical.event(uid, title, E2EClock.today(), 9));
        calendar.refresh();

        PlaywrightAssertions.assertThat(calendar.eventCard(title).first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(60_000));
    }
}
