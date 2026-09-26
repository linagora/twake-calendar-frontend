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
import com.linagora.calendar.e2e.pages.CalendarModal;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.LocatorAssertions;
import com.microsoft.playwright.assertions.PlaywrightAssertions;
import com.microsoft.playwright.options.WaitForSelectorState;

/** Calendar selection defects this project has already shipped. */
class PastCalendarsTest extends TwakeCalendarE2ETest {

    private void awaitAttached(Locator locator) {
        locator.first().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.ATTACHED));
    }

    private String seedEvent(CalendarProbe probe, E2EUser user) {
        String title = "Hidden " + UUID.randomUUID().toString().substring(0, 8);
        String uid = UUID.randomUUID().toString();
        probe.putEvent(user, uid, Ical.event(uid, title, E2EClock.today(), 9));
        return title;
    }

    @Test
    @DisplayName("PAST-34 (#242) A calendar created with a custom colour still renders after a reload")
    void aCalendarWithACustomColourSurvivesAReload(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String name = "Coloured " + UUID.randomUUID().toString().substring(0, 6);

        calendar.addCalendar().name(name).color("#AFCBEF").create();
        PlaywrightAssertions.assertThat(calendar.calendarCheckbox(name))
            .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(20_000));

        page.reload();
        calendar.waitUntilLoaded();

        // #242 crashed here, in the contrast computation of the calendar colour
        PlaywrightAssertions.assertThat(calendar.calendarCheckbox(name))
            .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(20_000));
        PlaywrightAssertions.assertThat(page.locator(".fc-view-harness")).isVisible();
    }

    @Test
    @DisplayName("PAST-35 (#159) A personal calendar can be unticked")
    void aPersonalCalendarCanBeUnticked(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = seedEvent(probe, user);
        page.reload();
        calendar.waitUntilLoaded();
        awaitAttached(calendar.eventCard(title));

        calendar.calendarCheckbox("My calendar").uncheck();

        PlaywrightAssertions.assertThat(calendar.calendarCheckbox("My calendar")).not().isChecked();
        PlaywrightAssertions.assertThat(calendar.eventCard(title))
            .hasCount(0, new LocatorAssertions.HasCountOptions().setTimeout(20_000));

        calendar.calendarCheckbox("My calendar").check();
        PlaywrightAssertions.assertThat(calendar.eventCard(title).first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(20_000));
    }

    @Test
    @DisplayName("PAST-36 (#908) A user is never offered to delegate their calendar to themselves")
    void aUserIsNeverOfferedToDelegateToThemselves(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        CalendarModal modal = calendar.modifyCalendar("My calendar").tab("Access");
        Locator search = page.getByPlaceholder("Start typing a name or email");
        search.click();
        search.pressSequentially(user.email(), new Locator.PressSequentiallyOptions().setDelay(30));
        page.waitForTimeout(3000);

        assertThat(page.locator("li[role=option]").allInnerTexts())
            .as("granting oneself a right on one's own calendar can only end badly")
            .noneMatch(option -> option.contains(user.email()));
        // and the row the owner already has offers no right to change and no cross to remove
        assertThat(modal.text()).contains("Owner");
        modal.close();
    }

    @Test
    @DisplayName("PAST-48 (#562) The CalDAV address of the Access tab points at the DAV server")
    void theCaldavAddressPointsAtTheDavServer(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        CalendarModal modal = calendar.modifyCalendar("My calendar").tab("Access");

        // the two addresses of the tab go to two different places on purpose: a CalDAV client
        // talks to the DAV server, while the secret link is served by the API
        assertThat(modal.caldavUrl())
            .as("a CalDAV client pointed at the API finds nothing to talk to")
            .startsWith("http://dav")
            .contains("/calendars/");
        assertThat(modal.secretUrl()).startsWith("http://api");
        modal.close();
    }

}
