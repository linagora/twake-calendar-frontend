package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
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
import com.linagora.calendar.e2e.pages.EventFormModal;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.linagora.calendar.e2e.pages.RecurrenceSection;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.WaitForSelectorState;

/** Building a recurrence rule from the form, and what it produces on the grid. */
class RecurrenceTest extends TwakeCalendarE2ETest {

    private static String title(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    private void awaitAttached(Locator locator) {
        locator.first().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.ATTACHED));
    }

    /** The rule the server ended up storing. */
    /** The dates of an event that really belong to the given month. */
    private List<String> datesIn(CalendarPage calendar, String title, YearMonth month) {
        return calendar.eventDates(title).stream()
            .filter(date -> YearMonth.from(LocalDate.parse(date)).equals(month))
            .toList();
    }

    private String rule(CalendarProbe probe, E2EUser user) {
        return Ics.property(Ics.master(probe.singleEvent(user)), "RRULE").orElseThrow();
    }

    /**
     * A series starting today at 09:00, built by the given recipe.
     *
     * <p>Reloads once it is saved: the SPA only shows a period it has fetched, and a range it
     * had already visited before the series existed stays empty until the page starts over.
     * Whether that is desirable is the business of SYNC-03, not of the recurrence tests.
     */
    private String series(CalendarPage calendar, java.util.function.Consumer<RecurrenceSection> recipe) {
        return series(calendar, null, recipe);
    }

    /** Same, starting on a chosen day, for the rules whose meaning depends on it. */
    private String series(CalendarPage calendar, LocalDate start,
                          java.util.function.Consumer<RecurrenceSection> recipe) {
        String title = title("Series");
        // by default from the first day of the week on screen: from today, a series has only a
        // day or two left in the week late in it, and weekday rules may have none at all
        LocalDate startsOn = start == null ? calendar.firstVisibleDate() : start;
        EventFormModal form = calendar.createEvent().title(title).expand()
            .startDate(startsOn).startTime("09:00").endTime("10:00");
        recipe.accept(form.repeat());
        form.save();
        if (start == null) {
            awaitAttached(calendar.eventCard(title));
        }
        calendar.page().reload();
        calendar.waitUntilLoaded();
        if (start == null) {
            awaitAttached(calendar.eventCard(title));
        }
        return title;
    }

    @Test
    @DisplayName("RECUR-01 A new event does not repeat by default")
    void aNewEventDoesNotRepeat(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Plain");

        var form = calendar.createEvent().title(title);
        assertThat(form.text()).contains("Doesn't repeat");
        form.save();
        awaitAttached(calendar.eventCard(title));

        assertThat(Ics.property(Ics.event(probe.singleEvent(user)), "RRULE")).isEmpty();
    }

    @Test
    @DisplayName("RECUR-02 A daily recurrence shows one occurrence on every day of the week")
    void aDailyRecurrenceCoversEveryDay(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = series(calendar, repeat -> repeat.frequency(RecurrenceSection.DAILY).endsNever());

        calendar.next();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(calendar.eventDates(title))
                .as("a daily series has nowhere to hide on a full week")
                .hasSize(7));
    }

    @Test
    @DisplayName("RECUR-03 A daily recurrence writes FREQ=DAILY;INTERVAL=1")
    void aDailyRecurrenceWritesItsRule(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        series(calendar, repeat -> repeat.frequency(RecurrenceSection.DAILY).every(1).endsNever());

        String rrule = rule(probe, user);
        assertThat(Ics.rulePart(rrule, "FREQ")).hasValue("DAILY");
        assertThat(Ics.rulePart(rrule, "INTERVAL").orElse("1")).isEqualTo("1");
    }

    @Test
    @DisplayName("RECUR-04 A daily interval of 2 only shows an occurrence every other day")
    void aDailyIntervalOfTwoSkipsADay(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = series(calendar,
            repeat -> repeat.frequency(RecurrenceSection.DAILY).every(2).endsNever());

        calendar.next();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() -> {
            List<String> dates = calendar.eventDates(title);
            assertThat(dates).hasSizeBetween(3, 4);
            for (int i = 1; i < dates.size(); i++) {
                assertThat(LocalDate.parse(dates.get(i)).toEpochDay()
                    - LocalDate.parse(dates.get(i - 1)).toEpochDay())
                    .as("every other day means a two day step")
                    .isEqualTo(2);
            }
        });
    }

    @Test
    @DisplayName("RECUR-05 A daily interval of 3 writes INTERVAL=3")
    void aDailyIntervalOfThreeWritesItsRule(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        series(calendar, repeat -> repeat.frequency(RecurrenceSection.DAILY).every(3).endsNever());

        assertThat(Ics.rulePart(rule(probe, user), "INTERVAL")).hasValue("3");
    }

    @Test
    @DisplayName("RECUR-06 Switching to weekly ticks the weekday of the start date")
    void switchingToWeeklyTicksTheStartWeekday(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        var form = calendar.createEvent().title(title("Weekly")).expand();
        // the day the form really opens on, which late in the evening is already tomorrow
        LocalDate startsOn = CalendarPage.parseLongDate(form.startDate());
        var repeat = form.repeat();
        repeat.frequency(RecurrenceSection.DAILY);
        repeat.frequency(RecurrenceSection.WEEKLY);

        String today = switch (startsOn.getDayOfWeek()) {
            case MONDAY -> "MO";
            case TUESDAY -> "TU";
            case WEDNESDAY -> "WE";
            case THURSDAY -> "TH";
            case FRIDAY -> "FR";
            case SATURDAY -> "SA";
            case SUNDAY -> "SU";
        };
        assertThat(repeat.isWeekdaySelected(today))
            .as("the day the event starts on is the obvious default")
            .isTrue();
    }

    @Test
    @DisplayName("RECUR-07 A weekly recurrence on Monday, Wednesday, Friday shows three occurrences")
    void aWeeklyRecurrenceOnThreeDays(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = series(calendar, repeat -> {
            repeat.frequency(RecurrenceSection.WEEKLY).endsNever();
            repeat.onlyWeekdays("MO", "WE", "FR");
        });

        calendar.next();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(calendar.eventDates(title))
                .hasSize(3)
                .allSatisfy(date -> assertThat(LocalDate.parse(date).getDayOfWeek())
                    .isIn(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY)));
    }

    @Test
    @DisplayName("RECUR-08 The weekday picker writes BYDAY in the iCalendar order")
    void theWeekdayPickerWritesByday(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        series(calendar, repeat -> {
            repeat.frequency(RecurrenceSection.WEEKLY).endsNever();
            repeat.onlyWeekdays("MO", "WE", "FR");
        });

        assertThat(Ics.rulePart(rule(probe, user), "BYDAY")).hasValue("MO,WE,FR");
    }

    @Test
    @DisplayName("RECUR-09 Unticking every weekday of a weekly recurrence drops BYDAY")
    void untickingEveryWeekdayDropsByday(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        series(calendar, repeat -> {
            repeat.frequency(RecurrenceSection.WEEKLY).endsNever();
            repeat.onlyWeekdays();
        });

        assertThat(Ics.rulePart(rule(probe, user), "BYDAY")).isEmpty();
    }

    @Test
    @DisplayName("RECUR-10 A weekly interval of 2 skips every other week")
    void aWeeklyIntervalOfTwoSkipsAWeek(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = series(calendar,
            repeat -> repeat.frequency(RecurrenceSection.WEEKLY).every(2).endsNever());

        calendar.next();
        Awaitility.await().atMost(Duration.ofSeconds(20)).untilAsserted(() ->
            assertThat(calendar.eventDates(title)).as("the week right after is skipped").isEmpty());

        calendar.next();
        Awaitility.await().atMost(Duration.ofSeconds(20)).untilAsserted(() ->
            assertThat(calendar.eventDates(title)).as("the one after is not").isNotEmpty());
    }

    @Test
    @DisplayName("RECUR-11 A monthly recurrence falls on the same day of month")
    void aMonthlyRecurrenceKeepsTheDayOfMonth(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        // the 15th exists in every month: a monthly rule skips the months missing its day rather
        // than rolling back, so anchoring on a safe day is what makes this test mean something
        LocalDate start = E2EClock.today().plusMonths(1).withDayOfMonth(15);
        String title = series(calendar, start,
            repeat -> repeat.frequency(RecurrenceSection.MONTHLY).endsNever());
        assertThat(Ics.rulePart(rule(probe, user), "FREQ")).hasValue("MONTHLY");

        calendar.switchView("Month");
        calendar.goToMonth(YearMonth.from(start.plusMonths(1)));

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(datesIn(calendar, title, YearMonth.from(start.plusMonths(1))))
                .containsExactly(start.plusMonths(1).toString()));
    }

    @Test
    @DisplayName("RECUR-12 A monthly recurrence on the 31st skips the short months")
    void aMonthlyRecurrenceOnThe31stSkipsShortMonths(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate onA31st = E2EClock.today().withDayOfMonth(1);
        while (onA31st.lengthOfMonth() != 31 || onA31st.withDayOfMonth(31).isBefore(E2EClock.today())) {
            onA31st = onA31st.plusMonths(1);
        }
        onA31st = onA31st.withDayOfMonth(31);

        String title = title("End of month");
        var form = calendar.createEvent().title(title).expand().startTime("09:00").endTime("10:00");
        form.startDate(onA31st);
        form.repeat().frequency(RecurrenceSection.MONTHLY).endsNever();
        form.save();
        page.reload();
        calendar.waitUntilLoaded();

        LocalDate shortMonth = onA31st.plusMonths(1);
        while (shortMonth.lengthOfMonth() == 31) {
            shortMonth = shortMonth.plusMonths(1);
        }
        calendar.switchView("Month");
        calendar.goToMonth(YearMonth.from(shortMonth));

        page.waitForTimeout(3000);
        assertThat(datesIn(calendar, title, YearMonth.from(shortMonth)))
            .as("%s has no 31st, so the series has no occurrence there", YearMonth.from(shortMonth))
            .isEmpty();
    }

    @Test
    @DisplayName("RECUR-13 A monthly interval of 3 behaves as a quarterly recurrence")
    void aMonthlyIntervalOfThreeIsQuarterly(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate start = E2EClock.today().plusMonths(1).withDayOfMonth(15);
        String title = series(calendar, start,
            repeat -> repeat.frequency(RecurrenceSection.MONTHLY).every(3).endsNever());

        String rrule = rule(probe, user);
        assertThat(Ics.rulePart(rrule, "FREQ")).hasValue("MONTHLY");
        assertThat(Ics.rulePart(rrule, "INTERVAL")).hasValue("3");

        calendar.switchView("Month");
        calendar.goToMonth(YearMonth.from(start.plusMonths(1)));
        page.waitForTimeout(2500);
        assertThat(datesIn(calendar, title, YearMonth.from(start.plusMonths(1))))
            .as("no occurrence one month later").isEmpty();

        calendar.goToMonth(YearMonth.from(start.plusMonths(3)));
        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(datesIn(calendar, title, YearMonth.from(start.plusMonths(3))))
                .as("one three months later")
                .containsExactly(start.plusMonths(3).toString()));
    }

    @Test
    @DisplayName("RECUR-14 A yearly recurrence comes back on the same date the following year")
    void aYearlyRecurrenceComesBackNextYear(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        // never a 29th of February, which a yearly rule skips for three years out of four
        LocalDate start = calendar.firstVisibleDate();
        if (start.getMonthValue() == 2 && start.getDayOfMonth() == 29) {
            start = start.plusDays(1);
        }
        String title = series(calendar, start,
            repeat -> repeat.frequency(RecurrenceSection.YEARLY).endsNever());
        assertThat(Ics.rulePart(rule(probe, user), "FREQ")).hasValue("YEARLY");
        // the series starts on the day the form opened on, not necessarily on today
        // the property value is already stripped of its parameters, so the date is its first
        // eight characters: 20260902T090000
        LocalDate startsOn = LocalDate.parse(
            Ics.property(Ics.master(probe.singleEvent(user)), "DTSTART").orElseThrow()
                .substring(0, 8),
            java.time.format.DateTimeFormatter.BASIC_ISO_DATE);

        calendar.switchView("Month");
        calendar.goToMonth(YearMonth.from(startsOn).plusYears(1));

        Awaitility.await().atMost(Duration.ofSeconds(45)).untilAsserted(() ->
            assertThat(calendar.eventDates(title))
                .contains(startsOn.plusYears(1).toString()));
    }

    @Test
    @DisplayName("RECUR-15 Switching from weekly to monthly clears BYDAY")
    void switchingFromWeeklyToMonthlyClearsByday(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        series(calendar, repeat -> {
            repeat.frequency(RecurrenceSection.WEEKLY).endsNever();
            repeat.frequency(RecurrenceSection.MONTHLY);
        });

        String rrule = rule(probe, user);
        assertThat(Ics.rulePart(rrule, "FREQ")).hasValue("MONTHLY");
        assertThat(Ics.rulePart(rrule, "BYDAY"))
            .as("weekdays mean nothing to a monthly rule")
            .isEmpty();
    }

    @Test
    @DisplayName("RECUR-16 The Always ending writes neither COUNT nor UNTIL")
    void theAlwaysEndingIsUnbounded(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        series(calendar, repeat -> repeat.frequency(RecurrenceSection.DAILY).endsNever());

        String rrule = rule(probe, user);
        assertThat(Ics.rulePart(rrule, "COUNT")).isEmpty();
        assertThat(Ics.rulePart(rrule, "UNTIL")).isEmpty();
    }

    @Test
    @DisplayName("RECUR-17 The After N occurrences ending writes COUNT and stops at the Nth")
    void theAfterEndingWritesCount(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = series(calendar,
            repeat -> repeat.frequency(RecurrenceSection.DAILY).endsAfter(3));

        assertThat(Ics.rulePart(rule(probe, user), "COUNT")).hasValue("3");
        calendar.next().next();
        page.waitForTimeout(2500);
        assertThat(calendar.eventDates(title)).as("three and no more").isEmpty();
    }

    @Test
    @DisplayName("RECUR-18 An ending after 1 occurrence produces a single event")
    void anEndingAfterOneOccurrence(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = series(calendar,
            repeat -> repeat.frequency(RecurrenceSection.DAILY).endsAfter(1));

        assertThat(Ics.rulePart(rule(probe, user), "COUNT")).hasValue("1");
        Awaitility.await().atMost(Duration.ofSeconds(20)).untilAsserted(() ->
            assertThat(calendar.eventDates(title)).hasSize(1));
    }

    @Test
    @DisplayName("RECUR-19 The Until ending shows nothing past the chosen date")
    void theUntilEndingStopsOnTheChosenDate(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate last = E2EClock.today().plusDays(2);
        String title = series(calendar,
            repeat -> repeat.frequency(RecurrenceSection.DAILY).endsOn(last));

        assertThat(Ics.rulePart(rule(probe, user), "UNTIL")).isPresent();
        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(calendar.eventDates(title))
                .allSatisfy(date -> assertThat(LocalDate.parse(date))
                    .isBeforeOrEqualTo(last)));
    }

    @Test
    @DisplayName("RECUR-20 The end date picker refuses a date before the start")
    void theEndDatePickerRefusesAPastDate(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        var repeat = calendar.createEvent().title(title("Bounded")).expand().repeat();
        repeat.frequency(RecurrenceSection.DAILY);

        assertThat(repeat.canEndOn(E2EClock.today().minusDays(1)))
            .as("a series cannot end before it starts")
            .isFalse();
    }

    @Test
    @DisplayName("RECUR-21 Switching from After to Until clears the occurrence count")
    void switchingFromAfterToUntilClearsTheCount(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        series(calendar, repeat -> {
            repeat.frequency(RecurrenceSection.DAILY).endsAfter(4);
            repeat.endsOn(E2EClock.today().plusDays(3));
        });

        String rrule = rule(probe, user);
        assertThat(Ics.rulePart(rrule, "UNTIL")).isPresent();
        assertThat(Ics.rulePart(rrule, "COUNT"))
            .as("a rule cannot be bounded twice")
            .isEmpty();
    }

    @Test
    @DisplayName("RECUR-22 Switching to Always clears both the count and the end date")
    void switchingToAlwaysClearsBothBounds(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        series(calendar, repeat -> {
            repeat.frequency(RecurrenceSection.DAILY).endsAfter(4);
            repeat.endsNever();
        });

        String rrule = rule(probe, user);
        assertThat(Ics.rulePart(rrule, "COUNT")).isEmpty();
        assertThat(Ics.rulePart(rrule, "UNTIL")).isEmpty();
    }

    @Test
    @DisplayName("RECUR-23 An interval of 0 is brought back to 1")
    void aZeroIntervalIsBroughtBackToOne(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        series(calendar, repeat -> repeat.frequency(RecurrenceSection.DAILY).every(0).endsNever());

        assertThat(Ics.rulePart(rule(probe, user), "INTERVAL").orElse("1"))
            .as("an interval of zero would mean an event repeating forever on the spot")
            .isEqualTo("1");
    }

    @Test
    @DisplayName("RECUR-24 A decimal interval is refused on input")
    void aDecimalIntervalIsRefused(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        var repeat = calendar.createEvent().title(title("Fractional")).expand().repeat();
        repeat.intervalInput().fill("");
        repeat.intervalInput().pressSequentially("2.5");

        assertThat(repeat.intervalInput().inputValue()).doesNotContain(".").doesNotContain(",");
    }

    @Test
    @DisplayName("RECUR-25 A recurrence on an all day event lands in the all day row")
    void aRecurrenceOnAnAllDayEvent(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Recurring holiday");

        var form = calendar.createEvent().title(title).expand().allDay();
        form.repeat().frequency(RecurrenceSection.DAILY).endsAfter(3);
        form.save();
        awaitAttached(calendar.eventCard(title));

        assertThat(Ics.rulePart(rule(probe, user), "FREQ")).hasValue("DAILY");
        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(calendar.allDayEventCards().allInnerTexts())
                .anySatisfy(text -> assertThat(text).contains(title)));
    }

    @Test
    @DisplayName("RECUR-26 The preview of an occurrence spells the rule out")
    void thePreviewSpellsTheRuleOut(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = series(calendar, repeat -> {
            repeat.frequency(RecurrenceSection.WEEKLY).every(2).endsNever();
            repeat.onlyWeekdays("MO", "WE");
        });

        String preview = calendar.openEvent(title).text();

        assertThat(preview).contains("Recurrent Event");
        assertThat(preview.toLowerCase())
            .contains("2")
            .contains("week")
            .contains("monday")
            .contains("wednesday");
    }

}
