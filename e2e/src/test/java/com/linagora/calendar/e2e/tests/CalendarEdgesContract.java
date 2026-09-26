package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.UUID;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.CalendarProbe;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.backend.Ical;
import com.linagora.calendar.e2e.backend.Ics;
import com.linagora.calendar.e2e.docker.E2EClock;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.EventFormModal;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.linagora.calendar.e2e.pages.RecurrenceSection;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.LocatorAssertions;
import com.microsoft.playwright.assertions.PlaywrightAssertions;

/**
 * The edges of the calendar: the first and last days of a month, at the first and the last
 * minutes of the day.
 *
 * <p>That is where a date computed in the wrong zone, an exclusive end read as inclusive or a
 * "tomorrow" that is off the grid show up -- and where a suite reading the wall clock fails one
 * week a month. Every scenario therefore runs four times, once per corner, on the deterministic
 * clock of {@link E2EClock}: the result does not depend on the day the suite runs. One subclass
 * per corner, so that the four run in parallel.
 */
abstract class CalendarEdgesContract extends TwakeCalendarE2ETest {
    private static final DateTimeFormatter MONTH_YEAR = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter ICS_LOCAL = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss");
    private static final DateTimeFormatter ICS_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final LocatorAssertions.IsAttachedOptions PATIENTLY =
        new LocatorAssertions.IsAttachedOptions().setTimeout(30_000);

    private static String title(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    /** Where the form puts a new event: the next round hour, which at 23:45 is tomorrow. */
    private static LocalDateTime nextRoundHour() {
        return E2EClock.now().truncatedTo(ChronoUnit.HOURS).plusHours(1);
    }

    private static Locator cardOn(CalendarPage calendar, LocalDate day, String title) {
        return calendar.dayColumn(day).locator(CalendarPage.EVENT_CARD)
            .filter(new Locator.FilterOptions().setHasText(title));
    }

    /** The start of an event, read back in the browser zone whatever form it was written in. */
    private static LocalDateTime startInBrowserZone(String vevent) {
        String value = Ics.property(vevent, "DTSTART").orElseThrow();
        if (value.endsWith("Z")) {
            return LocalDateTime.parse(value.substring(0, value.length() - 1), ICS_LOCAL)
                .atOffset(ZoneOffset.UTC).atZoneSameInstant(E2EClock.BROWSER_ZONE).toLocalDateTime();
        }
        String parameters = Ics.parameters(vevent, "DTSTART");
        java.time.ZoneId zone = parameters.contains("TZID=")
            ? java.time.ZoneId.of(parameters.replaceAll(".*TZID=([^;:]+).*", "$1"))
            : E2EClock.BROWSER_ZONE;
        return LocalDateTime.parse(value, ICS_LOCAL).atZone(zone)
            .withZoneSameInstant(E2EClock.BROWSER_ZONE).toLocalDateTime();
    }

    // ---------------------------------------------------------------- scenarios

    private void todayIsMarkedScenario(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        assertThat(calendar.markedToday()).contains(E2EClock.today());
        assertThat(calendar.visibleDates()).contains(E2EClock.today().toString());
    }

    private void monthViewOpensOnTodayScenario(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        calendar.switchView("Month");

        assertThat(calendar.displayedMonth()).isEqualTo(YearMonth.from(E2EClock.today()));
        assertThat(calendar.markedToday()).contains(E2EClock.today());
    }

    private void dayViewCrossesTheDayEdgesScenario(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate today = E2EClock.today();
        calendar.switchView("Day");
        PlaywrightAssertions.assertThat(calendar.dayColumn(today).first()).isAttached(PATIENTLY);

        calendar.next();
        PlaywrightAssertions.assertThat(calendar.dayColumn(today.plusDays(1)).first()).isAttached(PATIENTLY);
        calendar.previous().previous();
        PlaywrightAssertions.assertThat(calendar.dayColumn(today.minusDays(1)).first()).isAttached(PATIENTLY);
        assertThat(calendar.visibleDates()).containsExactly(today.minusDays(1).toString());
    }

    private void weekNavigationComesBackToTodayScenario(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate today = E2EClock.today();

        calendar.next();
        PlaywrightAssertions.assertThat(calendar.dayColumn(today.plusWeeks(1)).first()).isAttached(PATIENTLY);
        assertThat(calendar.visibleDates()).doesNotContain(today.toString());

        calendar.today();
        PlaywrightAssertions.assertThat(calendar.dayColumn(today).first()).isAttached(PATIENTLY);
        assertThat(calendar.markedToday()).contains(today);
    }

    private void monthNavigationCrossesTheMonthEdgesScenario(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        YearMonth month = YearMonth.from(E2EClock.today());
        calendar.switchView("Month");

        calendar.next();
        Awaitility.await().atMost(Duration.ofSeconds(20)).untilAsserted(() ->
            assertThat(calendar.displayedMonth()).isEqualTo(month.plusMonths(1)));
        calendar.previous().previous();
        Awaitility.await().atMost(Duration.ofSeconds(20)).untilAsserted(() ->
            assertThat(calendar.displayedMonth()).isEqualTo(month.minusMonths(1)));
    }

    private void miniCalendarShowsTheMonthOfTodayScenario(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        assertThat(calendar.miniCalendarMonth()).isEqualTo(E2EClock.today().format(MONTH_YEAR));
    }

    private void formDefaultsToTheNextRoundHourScenario(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDateTime expected = nextRoundHour();

        EventFormModal form = calendar.createEvent().expand();

        assertThat(form.startDate()).isEqualTo(CalendarPage.longDate(expected.toLocalDate()));
        assertThat(form.startTime()).isEqualTo(expected.toLocalTime().toString());
        assertThat(form.endDate()).isEqualTo(CalendarPage.longDate(expected.plusHours(1).toLocalDate()));
        assertThat(form.endTime()).isEqualTo(expected.plusHours(1).toLocalTime().toString());
    }

    private void quickEventLandsOnTheDefaultSlotScenario(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Edge slot");
        LocalDateTime expected = nextRoundHour();

        calendar.createEvent().title(title).save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(startInBrowserZone(Ics.event(probe.singleEvent(user))))
                .as("the event is written where the form said it would be")
                .isEqualTo(expected));
        calendar.goToDate(expected.toLocalDate());
        PlaywrightAssertions.assertThat(cardOn(calendar, expected.toLocalDate(), title).first())
            .isAttached(PATIENTLY);
    }

    private void allDayEventLandsOnTheDefaultDayScenario(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Edge day");
        LocalDate expected = nextRoundHour().toLocalDate();

        EventFormModal form = calendar.createEvent().title(title).expand().allDay();
        assertThat(form.startDate()).isEqualTo(CalendarPage.longDate(expected));
        form.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() -> {
            String vevent = Ics.event(probe.singleEvent(user));
            assertThat(Ics.parameters(vevent, "DTSTART")).contains("VALUE=DATE");
            assertThat(Ics.property(vevent, "DTSTART")).hasValue(expected.format(ICS_DATE));
            Ics.property(vevent, "DTEND").ifPresent(end ->
                assertThat(end).as("an all day event ends, exclusively, the next day")
                    .isEqualTo(expected.plusDays(1).format(ICS_DATE)));
        });
        calendar.goToDate(expected);
        PlaywrightAssertions.assertThat(cardOn(calendar, expected, title).first()).isAttached(PATIENTLY);
    }

    private void dailySeriesRunsAcrossTheEdgeScenario(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Edge series");
        LocalDate first = nextRoundHour().toLocalDate();

        EventFormModal form = calendar.createEvent().title(title).expand();
        form.repeat().frequency(RecurrenceSection.DAILY).endsAfter(3);
        form.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(Ics.rulePart(Ics.property(Ics.master(probe.singleEvent(user)), "RRULE")
                .orElseThrow(), "COUNT")).hasValue("3"));
        for (int index = 0; index < 3; index++) {
            LocalDate day = first.plusDays(index);
            calendar.goToDate(day);
            PlaywrightAssertions.assertThat(cardOn(calendar, day, title).first()).isAttached(PATIENTLY);
        }
        calendar.goToDate(first.plusDays(3));
        assertThat(calendar.eventDates(title)).doesNotContain(first.plusDays(3).toString());
    }

    private void eventSpanningTheMonthEdgeShowsOnBothDaysScenario(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate first = E2EClock.firstDayOfEdgeMonth();
        LocalDate last = first.minusDays(1);
        String title = title("Night shift");
        String uid = UUID.randomUUID().toString();
        probe.putEvent(user, uid, Ical.eventBetween(uid, title,
            last.atTime(23, 30).atZone(E2EClock.BROWSER_ZONE),
            first.atTime(0, 30).atZone(E2EClock.BROWSER_ZONE)));
        page.reload();
        calendar.waitUntilLoaded();
        calendar.switchView("Day");

        calendar.goToDate(last);
        PlaywrightAssertions.assertThat(cardOn(calendar, last, title).first()).isAttached(PATIENTLY);
        calendar.goToDate(first);
        PlaywrightAssertions.assertThat(cardOn(calendar, first, title).first()).isAttached(PATIENTLY);
    }

    private void eventsAtTheMonthEdgeStayInTheirMonthScenario(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate first = E2EClock.firstDayOfEdgeMonth();
        LocalDate last = first.minusDays(1);
        String late = title("Closing");
        String early = title("Opening");
        String lateUid = UUID.randomUUID().toString();
        String earlyUid = UUID.randomUUID().toString();
        probe.putEvent(user, lateUid, Ical.eventBetween(lateUid, late,
            last.atTime(23, 0).atZone(E2EClock.BROWSER_ZONE),
            last.atTime(23, 45).atZone(E2EClock.BROWSER_ZONE)));
        probe.putEvent(user, earlyUid, Ical.eventBetween(earlyUid, early,
            first.atTime(0, 0).atZone(E2EClock.BROWSER_ZONE),
            first.atTime(1, 0).atZone(E2EClock.BROWSER_ZONE)));
        page.reload();
        calendar.waitUntilLoaded();
        calendar.switchView("Month");

        calendar.goToMonth(YearMonth.from(last));
        PlaywrightAssertions.assertThat(cardOn(calendar, last, late).first()).isAttached(PATIENTLY);
        assertThat(cardOn(calendar, last, early).count()).isZero();
        calendar.goToMonth(YearMonth.from(first));
        PlaywrightAssertions.assertThat(cardOn(calendar, first, early).first()).isAttached(PATIENTLY);
        assertThat(cardOn(calendar, first, late).count()).isZero();
    }

    // ---------------------------------------------------------------- the tests

    @Test
    @DisplayName("EDGE-01 The week grid marks the clock's day as today")
    void todayIsMarked(Page page, E2EUser user) {
        todayIsMarkedScenario(page, user);
    }

    @Test
    @DisplayName("EDGE-02 The month view opens on the month of today and marks today")
    void monthViewOpensOnToday(Page page, E2EUser user) {
        monthViewOpensOnTodayScenario(page, user);
    }

    @Test
    @DisplayName("EDGE-03 The day view walks into the next and the previous day")
    void dayViewCrossesTheDayEdges(Page page, E2EUser user) {
        dayViewCrossesTheDayEdgesScenario(page, user);
    }

    @Test
    @DisplayName("EDGE-04 Next week then Today brings the week of today back")
    void weekNavigationComesBackToToday(Page page, E2EUser user) {
        weekNavigationComesBackToTodayScenario(page, user);
    }

    @Test
    @DisplayName("EDGE-05 The month view walks to the next and the previous month")
    void monthNavigationCrossesTheMonthEdges(Page page, E2EUser user) {
        monthNavigationCrossesTheMonthEdgesScenario(page, user);
    }

    @Test
    @DisplayName("EDGE-06 The mini calendar opens on the month of today")
    void miniCalendarShowsTheMonthOfToday(Page page, E2EUser user) {
        miniCalendarShowsTheMonthOfTodayScenario(page, user);
    }

    @Test
    @DisplayName("EDGE-07 The creation form defaults to the next round hour, date included")
    void formDefaultsToTheNextRoundHour(Page page, E2EUser user) {
        formDefaultsToTheNextRoundHourScenario(page, user);
    }

    @Test
    @DisplayName("EDGE-08 A quick event is stored and shown at the slot the form offered")
    void quickEventLandsOnTheDefaultSlot(Page page, E2EUser user, CalendarProbe probe) {
        quickEventLandsOnTheDefaultSlotScenario(page, user, probe);
    }

    @Test
    @DisplayName("EDGE-09 An all day event is stored and shown on the day the form offered")
    void allDayEventLandsOnTheDefaultDay(Page page, E2EUser user, CalendarProbe probe) {
        allDayEventLandsOnTheDefaultDayScenario(page, user, probe);
    }

    @Test
    @DisplayName("EDGE-10 A daily series of three shows on three consecutive days")
    void dailySeriesRunsAcrossTheEdge(Page page, E2EUser user, CalendarProbe probe) {
        dailySeriesRunsAcrossTheEdgeScenario(page, user, probe);
    }

    @Test
    @DisplayName("EDGE-11 An event spanning midnight between two months shows on both days")
    void eventSpanningTheMonthEdgeShowsOnBothDays(Page page, E2EUser user, CalendarProbe probe) {
        eventSpanningTheMonthEdgeShowsOnBothDaysScenario(page, user, probe);
    }

    @Test
    @DisplayName("EDGE-12 Events at 23:00 on the last day and 00:00 on the first stay on their day")
    void eventsAtTheMonthEdgeStayInTheirMonth(Page page, E2EUser user, CalendarProbe probe) {
        eventsAtTheMonthEdgeStayInTheirMonthScenario(page, user, probe);
    }
}
