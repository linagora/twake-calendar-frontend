package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.CalendarProbe;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.backend.Ical;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.PlaywrightAssertions;

class CalendarNavigationTest extends TwakeCalendarE2ETest {

    @Test
    @DisplayName("NAV-01 Next moves the week view to the following week")
    void nextMovesToTheFollowingWeek(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        List<String> currentWeek = calendar.visibleDayHeaders();

        calendar.next();

        assertThat(calendar.visibleDayHeaders())
            .hasSize(7)
            .isNotEqualTo(currentWeek);
    }

    @Test
    @DisplayName("NAV-02 Today comes back to the current week after browsing away")
    void todayComesBackToTheCurrentWeek(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        List<String> currentWeek = calendar.visibleDayHeaders();

        calendar.next().next().previous().previous();

        assertThat(calendar.visibleDayHeaders()).isEqualTo(currentWeek);

        calendar.next().today();

        assertThat(calendar.visibleDayHeaders()).isEqualTo(currentWeek);
    }

    @Test
    @DisplayName("NAV-03 Switching to the month view renders a month grid")
    void monthViewRendersAMonthGrid(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        calendar.switchView("Month");

        assertThat(calendar.currentViewClass()).contains("fc-dayGridMonth-view");
    }

    @Test
    @DisplayName("NAV-04 Switching to the day view narrows the grid down to a single column")
    void dayViewRendersASingleDay(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        calendar.switchView("Day");

        assertThat(calendar.currentViewClass()).contains("fc-timeGridDay-view");
        assertThat(calendar.visibleDayHeaders()).hasSize(1);
    }

    @Test
    @DisplayName("NAV-05 Switching to the schedule view lists the events in chronological order")
    void scheduleViewListsTheEvents(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String morning = "Morning " + java.util.UUID.randomUUID().toString().substring(0, 6);
        String evening = "Evening " + java.util.UUID.randomUUID().toString().substring(0, 6);
        calendar.createEvent().title(morning).expand().startTime("08:00").endTime("09:00").save();
        calendar.createEvent().title(evening).expand().startTime("18:00").endTime("19:00").save();

        calendar.switchView("Schedule");

        assertThat(calendar.currentViewClass()).contains("fc-list");
        String listed = page.locator(".fc-view-harness").innerText();
        assertThat(listed.indexOf(morning))
            .as("the schedule reads in time order")
            .isLessThan(listed.indexOf(evening));
    }

    @Test
    @DisplayName("NAV-06 The week view shows seven day columns")
    void theWeekViewShowsSevenColumns(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        assertThat(calendar.currentViewClass()).contains("fc-timeGridWeek-view");
        assertThat(calendar.visibleDayHeaders()).hasSize(7);
    }

    @Test
    @DisplayName("NAV-07 Previous from the month view goes back one month")
    void previousFromMonthGoesBackOneMonth(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        calendar.switchView("Month");
        String current = calendar.periodTitle();

        calendar.previous();

        String expected = java.time.LocalDate.now().minusMonths(1)
            .format(java.time.format.DateTimeFormatter.ofPattern("MMMM yyyy", java.util.Locale.ENGLISH));
        PlaywrightAssertions.assertThat(page.locator(".current-date-time"))
            .containsText(expected.split(" ")[0],
                new com.microsoft.playwright.assertions.LocatorAssertions.ContainsTextOptions().setTimeout(20_000));
        assertThat(calendar.periodTitle()).isNotEqualTo(current);
    }

    @Test
    @DisplayName("NAV-08 Next from the day view moves forward one day")
    void nextFromDayMovesForwardOneDay(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        calendar.switchView("Day");
        List<String> today = calendar.visibleDayHeaders();

        calendar.next();

        assertThat(calendar.visibleDayHeaders()).hasSize(1).isNotEqualTo(today);
        PlaywrightAssertions.assertThat(calendar.dayColumn(java.time.LocalDate.now().plusDays(1)).first())
            .isAttached();
    }

    @Test
    @DisplayName("NAV-09 The menubar title reflects the displayed period")
    void theMenubarTitleReflectsThePeriod(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        // the title names the month of the week on screen, which is not always the month of
        // today: a week straddling a month boundary belongs to the month it starts in
        assertThat(calendar.periodTitle()).contains(monthOf(calendar.firstVisibleDate()));

        calendar.next().next().next().next().next();

        assertThat(calendar.periodTitle()).contains(monthOf(calendar.firstVisibleDate()));
    }

    private static String monthOf(java.time.LocalDate date) {
        return date.format(java.time.format.DateTimeFormatter
            .ofPattern("MMMM", java.util.Locale.ENGLISH));
    }

    @Test
    @DisplayName("NAV-12 The current day column is highlighted in the week view")
    void todayIsHighlightedInTheWeekView(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        PlaywrightAssertions.assertThat(page.locator(".fc-timegrid-col.fc-day-today").first()).isAttached();
        assertThat(calendar.dayColumn(java.time.LocalDate.now()).count()).isPositive();
    }

    @Test
    @DisplayName("NAV-13 The schedule view says so when the period holds no event")
    void theScheduleViewSaysWhenItIsEmpty(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        calendar.switchView("Schedule");

        PlaywrightAssertions.assertThat(page.getByText("No events to display").first())
            .isVisible(new com.microsoft.playwright.assertions.LocatorAssertions.IsVisibleOptions()
                .setTimeout(20_000));
    }

    @Test
    @DisplayName("NAV-14 Changing view keeps the displayed date")
    void changingViewKeepsTheDate(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        calendar.next().next();
        // read the date off the grid rather than computing it: the day view keeps the first day
        // of the week that was on screen, whatever the calendar arithmetic would suggest
        java.time.LocalDate shown = calendar.firstVisibleDate();

        calendar.switchView("Day");

        PlaywrightAssertions.assertThat(calendar.dayColumn(shown).first())
            .isAttached(new com.microsoft.playwright.assertions.LocatorAssertions.IsAttachedOptions()
                .setTimeout(20_000));
    }

    @Test
    @DisplayName("NAV-15 The time grid is scrolled to the working hours on opening")
    void theTimeGridIsScrolledOnOpening(Page page, E2EUser user) {
        LoginPage.loginAs(page, user);
        page.waitForTimeout(3000);

        Object scrollTop = page.evaluate(
            "() => { const s = document.querySelector('.fc-timegrid .fc-scroller-liquid-absolute')"
            + " || document.querySelector('.fc-timegrid .fc-scroller'); return s ? s.scrollTop : -1; }");
        assertThat(((Number) scrollTop).doubleValue())
            .as("midnight is never what the user wants to see first")
            .isGreaterThan(0);
    }

    @Test
    @DisplayName("NAV-16 Browsing twelve weeks in a row does not duplicate any event")
    void browsingTwelveWeeksDoesNotDuplicate(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = "Once " + java.util.UUID.randomUUID().toString().substring(0, 6);
        calendar.createEvent(title);

        for (int i = 0; i < 12; i++) {
            calendar.next();
        }
        for (int i = 0; i < 12; i++) {
            calendar.previous();
        }

        PlaywrightAssertions.assertThat(calendar.eventCard(title))
            .hasCount(1, new com.microsoft.playwright.assertions.LocatorAssertions.HasCountOptions()
                .setTimeout(30_000));
    }

    @Test
    @DisplayName("NAV-17 (#1412) The month view shows the events of the adjacent-month days of its last row")
    void theMonthViewShowsTheEventsOfItsLastRow(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        // a month ahead, so that nothing has been loaded around it yet, whose days fit in
        // five weeks: its sixth row is then only made of days of the next month
        YearMonth month = Stream.iterate(YearMonth.now().plusMonths(2), m -> m.plusMonths(1))
            .filter(m -> firstGridDay(m).plusWeeks(5).isAfter(m.atEndOfMonth()))
            .findFirst()
            .orElseThrow();
        // the month grid always renders six weeks
        LocalDate lastGridDay = firstGridDay(month)
            .plusWeeks(6)
            .minusDays(1);
        String title = "Last row " + UUID.randomUUID().toString().substring(0, 6);
        String uid = UUID.randomUUID().toString();
        probe.putEvent(user, uid, Ical.event(uid, title, lastGridDay, 12));

        calendar.switchView("Month");
        calendar.goToMonth(month);

        assertThat(calendar.visibleDates()).contains(lastGridDay.toString());
        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(calendar.eventDates(title))
                .as("every day of the grid is loaded, not only the days of the month")
                .containsExactly(lastGridDay.toString()));
    }

    private static LocalDate firstGridDay(YearMonth month) {
        return month.atDay(1).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    @Test
    @DisplayName("NAV-11The week number shown matches the ISO week of the displayed days")
    void theWeekNumberMatchesTheDisplayedWeek(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        // both read from the grid: the ISO week of the days on screen, and the number the axis
        // prints. Recomputing either from the clock would go wrong on a run crossing midnight.
        java.time.LocalDate firstDay = calendar.firstVisibleDate();
        int isoWeek = firstDay.get(java.time.temporal.WeekFields.ISO.weekOfWeekBasedYear());

        assertThat(calendar.weekNumber().first().innerText())
            .as("the number on the axis is the ISO week of the days it sits beside")
            .contains(String.valueOf(isoWeek));

        calendar.next();
        int nextIsoWeek = calendar.firstVisibleDate()
            .get(java.time.temporal.WeekFields.ISO.weekOfWeekBasedYear());
        assertThat(calendar.weekNumber().first().innerText())
            .as("and it follows the grid when the grid moves on")
            .contains(String.valueOf(nextIsoWeek));
    }

}
