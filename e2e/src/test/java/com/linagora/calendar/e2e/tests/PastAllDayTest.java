package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.CalendarProbe;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.backend.Ics;
import com.linagora.calendar.e2e.docker.E2EClock;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.LocatorAssertions;
import com.microsoft.playwright.assertions.PlaywrightAssertions;
import com.microsoft.playwright.options.WaitForSelectorState;

/** All day event defects this project has already shipped. */
class PastAllDayTest extends TwakeCalendarE2ETest {

    private static String title(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    private void awaitAttached(Locator locator) {
        locator.first().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.ATTACHED));
    }

    private static List<String> dates(String ical) {
        return List.of(Ics.property(Ics.event(ical), "DTSTART").orElseThrow(),
            Ics.property(ical, "DTEND").orElse(""));
    }

    @Test
    @DisplayName("PAST-23 (#425) Renaming an all day event does not stretch it over two days")
    void renamingAnAllDayEventKeepsItsDates(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Day off");
        calendar.createEvent().title(title).expand().allDay().save();
        awaitAttached(calendar.eventCard(title));
        List<String> before = dates(probe.singleEvent(user));

        String renamed = title("Day off renamed");
        var edited = calendar.openEvent(title).edit();
        edited.title(renamed);
        edited.save();
        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(probe.singleEvent(user)).contains("SUMMARY:" + renamed));

        assertThat(dates(probe.singleEvent(user)))
            .as("only the title changed, the event must not travel or grow")
            .isEqualTo(before);
    }

    @Test
    @DisplayName("PAST-24 (#870) Creating an all day event on the clicked day lands on that day")
    void creatingAnAllDayEventLandsOnTheClickedDay(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate target = calendar.anotherDayOfTheWeekOnScreen();
        String title = title("Clicked day");

        calendar.createEvent()
            .title(title)
            .expand()
            .allDay()
            .startDate(target)
            .save();
        awaitAttached(calendar.eventCard(title));

        assertThat(Ics.property(Ics.event(probe.singleEvent(user)), "DTSTART").orElseThrow())
            .as("the day picked in the form is the day the event belongs to, not the one before")
            .startsWith(target.toString().replace("-", ""));
        PlaywrightAssertions.assertThat(calendar.dayColumn(target).locator(CalendarPage.EVENT_CARD)
                .filter(new Locator.FilterOptions().setHasText(title)).first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(30_000));
    }

    @Test
    @DisplayName("PAST-25 (#942) Moving an all day event one day back moves it exactly one day back")
    void movingAnAllDayEventMovesItByOneDay(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        // both days taken from the week on screen: three days from today lands in next week
        // when the suite runs late in the week, and an event there is not on the grid at all
        LocalDate start = calendar.firstVisibleDate().plusDays(3);
        LocalDate target = start.minusDays(1);
        String title = title("Travelling");

        calendar.createEvent().title(title).expand().allDay()
            .startDate(start).save();
        awaitAttached(calendar.eventCard(title));

        var edited = calendar.openEvent(title).edit().expand();
        edited.startDate(target);
        edited.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(Ics.property(Ics.event(probe.singleEvent(user)), "DTSTART").orElseThrow())
                .as("one day back means one day back, not two")
                .startsWith(target.toString().replace("-", "")));
    }

    @Test
    @DisplayName("PAST-26 (#774) The time inputs stay hidden for an all day event, multi day included")
    void timeInputsStayHiddenForAllDayEvents(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        var form = calendar.createEvent().title(title("Offsite")).expand().allDay();

        PlaywrightAssertions.assertThat(page.getByTestId("start-time-input")).hasCount(0);
        PlaywrightAssertions.assertThat(page.getByTestId("end-time-input")).hasCount(0);

        // and still hidden once it spans several days
        form.endDate(E2EClock.today().plusDays(1));
        PlaywrightAssertions.assertThat(page.getByTestId("start-time-input")).hasCount(0);
        PlaywrightAssertions.assertThat(page.getByTestId("end-time-input")).hasCount(0);
    }
}
