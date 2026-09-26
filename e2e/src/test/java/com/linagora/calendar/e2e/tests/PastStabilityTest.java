package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.CalendarProbe;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.backend.Ical;
import com.linagora.calendar.e2e.docker.ClockAt;
import com.linagora.calendar.e2e.docker.E2EClock;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.LocatorAssertions;
import com.microsoft.playwright.assertions.PlaywrightAssertions;
import com.microsoft.playwright.options.WaitForSelectorState;

/** Loading and stability defects this project has already shipped. */
class PastStabilityTest extends TwakeCalendarE2ETest {

    private void awaitAttached(Locator locator) {
        locator.first().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.ATTACHED));
    }

    @Test
    @DisplayName("PAST-41 (#623) A tab that lost the network recovers on its own, without a blank page")
    void aTabThatLostTheNetworkRecovers(Page page, E2EUser user, BrowserContext context,
                                        CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = "Survivor " + UUID.randomUUID().toString().substring(0, 8);

        context.setOffline(true);
        page.waitForTimeout(4000);
        context.setOffline(false);

        String uid = UUID.randomUUID().toString();
        probe.putEvent(user, uid, Ical.event(uid, title, E2EClock.today(), 9));
        calendar.refresh();

        // the shell must still be there, and the app must still be able to load data
        PlaywrightAssertions.assertThat(page.getByLabel("Create a new event")).isVisible();
        PlaywrightAssertions.assertThat(calendar.eventCard(title).first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(45_000));
    }

    @Test
    @DisplayName("PAST-42 (#488) A 401 on the websocket ticket does not trap the app in a loading loop")
    void a401OnTheTicketDoesNotLoopForever(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        page.route("**/ws/ticket", route -> route.fulfill(
            new com.microsoft.playwright.Route.FulfillOptions().setStatus(401).setBody("")));

        calendar.createEvent().title("Never saved " + UUID.randomUUID()).trySave();
        page.waitForTimeout(15_000);

        // whatever it does -- surface an error or go back to the SSO -- it must not spin forever
        boolean backAtTheSso = page.url().contains("sso");
        boolean stillUsable = page.getByLabel("Create a new event").count() > 0;
        assertThat(backAtTheSso || stillUsable)
            .as("the app must resolve the failure, url was %s", page.url())
            .isTrue();
    }

    @Test
    @DisplayName("PAST-43 (#617) Browsing quickly across many weeks does not break the calendar")
    void browsingQuicklyDoesNotBreakTheCalendar(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = "Anchor " + UUID.randomUUID().toString().substring(0, 8);
        String uid = UUID.randomUUID().toString();
        probe.putEvent(user, uid, Ical.event(uid, title, E2EClock.today(), 9));
        page.reload();
        calendar.waitUntilLoaded();
        awaitAttached(calendar.eventCard(title));

        for (int i = 0; i < 12; i++) {
            calendar.next();
        }
        for (int i = 0; i < 12; i++) {
            calendar.previous();
        }

        PlaywrightAssertions.assertThat(calendar.eventCard(title).first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(45_000));
    }

    @Test
    @DisplayName("PAST-44 (#1156) The mini calendar highlights today on load")
    void theMiniCalendarHighlightsToday(Page page, E2EUser user) {
        LoginPage.loginAs(page, user);

        Locator today = page.locator("button.MuiPickerDay-root.Mui-selected");

        PlaywrightAssertions.assertThat(today.first()).isVisible();
        assertThat(today.first().innerText().trim())
            .as("the mini calendar must open on the current week, today selected")
            .isEqualTo(String.valueOf(E2EClock.today().getDayOfMonth()));
    }

    @Test
    @ClockAt(day = ClockAt.Day.SUNDAY, time = "10:00")
    @DisplayName("EDGE-13 The mini calendar highlights today on a Sunday, not the Monday of its week")
    void theMiniCalendarHighlightsTodayOnASunday(Page page, E2EUser user) {
        LoginPage.loginAs(page, user);

        Locator today = page.locator("button.MuiPickerDay-root.Mui-selected");

        PlaywrightAssertions.assertThat(today.first()).isVisible();
        assertThat(today.first().innerText().trim())
            .as("a week drawn from Monday to Sunday holds its Sunday: today is in it")
            .isEqualTo(String.valueOf(E2EClock.today().getDayOfMonth()));
    }
}
