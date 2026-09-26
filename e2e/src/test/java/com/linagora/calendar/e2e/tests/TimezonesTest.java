package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.LocalDate;
import java.time.Month;
import java.time.ZoneId;
import java.util.UUID;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.CalendarProbe;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.backend.E2EUserFactory;
import com.linagora.calendar.e2e.backend.Ics;
import com.linagora.calendar.e2e.docker.E2EClock;
import com.linagora.calendar.e2e.docker.E2ESessions;
import com.linagora.calendar.e2e.docker.RuntimeConfig;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.linagora.calendar.e2e.pages.RecurrenceSection;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.LocatorAssertions;
import com.microsoft.playwright.assertions.PlaywrightAssertions;
import com.microsoft.playwright.options.WaitForSelectorState;

/** Timezones: what the form writes, and what each viewer sees. */
class TimezonesTest extends TwakeCalendarE2ETest {

    /** Thirteen hours ahead of UTC, eleven ahead of the Paris browser of the suite: the day differs too. */
    private static final String TONGATAPU = "Pacific/Tongatapu";

    private static String title(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    private void awaitAttached(Locator locator) {
        locator.first().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.ATTACHED));
    }

    /**
     * The form closes as soon as it is submitted, so the PUT may still be in flight: a test that
     * reads the store straight away sees an empty calendar. Waits until the event is there.
     */
    private void awaitStored(CalendarProbe probe, E2EUser user, String title) {
        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(probe.eventSummaries(user)).containsExactly(title));
    }

    /** The next last Sunday of a month, when Europe shifts its clocks. */
    private static LocalDate clockChange(Month month) {
        LocalDate change = lastSunday(E2EClock.today().getYear(), month);
        // recomputed for the next year, not shifted by one: a year later it is another weekday
        return change.isBefore(E2EClock.today()) ? lastSunday(change.getYear() + 1, month) : change;
    }

    private static LocalDate lastSunday(int year, Month month) {
        return LocalDate.of(year, month, 1)
            .with(java.time.temporal.TemporalAdjusters.lastInMonth(java.time.DayOfWeek.SUNDAY));
    }

    @Test
    @DisplayName("TZ-01 The default timezone of the form is the one from the settings")
    void theFormDefaultsToTheConfiguredTimezone(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        calendar.openSettings().selectTimezone("Asia/Tokyo").backToCalendar();

        var form = calendar.createEvent().expand();

        // the settings write lands in the store asynchronously: a strict assert races it
        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(form.timezone()).contains("Asia/Tokyo"));
    }

    @Test
    @DisplayName("TZ-02 Changing the timezone of an event shifts its display")
    void changingTheTimezoneShiftsTheDisplay(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Shifted");
        calendar.createEvent().title(title).expand().startTime("10:00").endTime("11:00").save();
        awaitAttached(calendar.eventCard(title));
        String before = calendar.eventCard(title).first().innerText();

        var form = calendar.openEvent(title).edit().expand();
        form.timezone("Asia/Tokyo");
        form.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(calendar.eventCard(title).first().innerText())
                .as("10:00 in Tokyo is not 10:00 in Paris")
                .isNotEqualTo(before));
    }

    @Test
    @DisplayName("TZ-03 The chosen timezone is written in DTSTART")
    void theChosenTimezoneIsWritten(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Tagged");

        calendar.createEvent().title(title).expand()
            .timezone("Asia/Tokyo").startTime("09:00").endTime("10:00").save();
        awaitAttached(calendar.eventCard(title));

        assertThat(Ics.parameters(Ics.event(probe.singleEvent(user)), "DTSTART"))
            .contains("TZID=Asia/Tokyo");
    }

    @Test
    @DisplayName("TZ-04 The timezone search filters the list")
    void theTimezoneSearchFilters(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        var form = calendar.createEvent().expand();

        java.util.List<String> offered = form.timezoneOptions("Reykjav");

        assertThat(offered).isNotEmpty();
        assertThat(offered)
            .allSatisfy(option -> assertThat(option).containsIgnoringCase("reykjav"));
        assertThat(form.text()).isNotBlank();
    }

    @Test
    @DisplayName("TZ-06 The grid axis shows the current UTC offset")
    void theGridAxisShowsTheOffset(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        assertThat(calendar.weekNumber().first().innerText())
            .as("the axis tells the reader which clock the grid is drawn against")
            .containsPattern("UTC[+-]\\d");
    }

    @Test
    @DisplayName("TZ-07 An event created in Paris reads correctly for a guest in Tokyo")
    void anEventCreatedInParisReadsFromTokyo(Page page, E2EUser organizer, E2EUserFactory users,
                                             E2ESessions sessions) {
        E2EUser guest = users.newUser();
        // the application draws the grid against the *user's* configured zone, not the browser's
        CalendarPage tokyo = inTimezone(sessions.openFor(guest), "Asia/Tokyo");
        CalendarPage paris = LoginPage.loginAs(page, organizer);

        String title = title("From Paris");
        LocalDate day = paris.browserToday();
        paris.createEvent().title(title).addGuest(guest.email())
            .expand().startDate(day).startTime("10:00").endTime("11:00").save();
        awaitAttached(paris.eventCard(title));

        tokyo.page().reload();
        tokyo.waitUntilLoaded();
        // seven hours ahead, Tokyo may already be showing the next week
        tokyo.goToDate(day);
        PlaywrightAssertions.assertThat(tokyo.eventCard(title).first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(60_000));
        assertThat(tokyo.eventCard(title).first().innerText())
            .as("the same instant, read on a clock seven hours ahead")
            .doesNotContain("10:00");
    }

    private static CalendarPage inTimezone(CalendarPage calendar, String zone) {
        calendar.openSettings().selectTimezone(zone).backToCalendar();
        return calendar;
    }

    @Test
    @DisplayName("TZ-08 An event created in Tokyo reads correctly from Paris")
    void anEventCreatedInTokyoReadsFromParis(Page page, E2EUser user, E2ESessions sessions,
                                             CalendarProbe probe) {
        CalendarPage paris = LoginPage.loginAs(page, user);
        String title = title("From Tokyo");

        paris.createEvent().title(title).expand()
            .timezone("Asia/Tokyo").startTime("18:00").endTime("19:00").save();
        awaitAttached(paris.eventCard(title));

        assertThat(Ics.property(Ics.event(probe.singleEvent(user)), "DTSTART").orElseThrow())
            .endsWith("T180000");
        assertThat(paris.eventCard(title).first().innerText())
            .as("18:00 in Tokyo is not 18:00 in Paris")
            .doesNotContain("18:00");
    }

    @Test
    @DisplayName("TZ-09 An all day event does not move from one timezone to another")
    void anAllDayEventDoesNotMove(Page page, E2EUser user, E2ESessions sessions) {
        CalendarPage paris = LoginPage.loginAs(page, user);
        LocalDate day = paris.anotherDayOfTheWeekOnScreen();
        String title = title("Holiday");
        paris.createEvent().title(title).expand().allDay().startDate(day).save();
        awaitAttached(paris.eventCard(title));

        CalendarPage tokyo = inTimezone(sessions.openFor(user, "Asia/Tokyo"), "Asia/Tokyo");
        tokyo.page().reload();
        tokyo.waitUntilLoaded();
        // seven hours ahead, Tokyo is already in the next week on a Sunday evening
        tokyo.goToDate(day);

        Awaitility.await().atMost(Duration.ofSeconds(60)).untilAsserted(() ->
            assertThat(tokyo.eventDates(title))
                .as("a day off is the same day everywhere")
                .containsExactly(day.toString()));
    }

    @Test
    @DisplayName("TZ-10 The spring clock change does not shift a daily recurring event")
    void theSpringChangeDoesNotShiftADailySeries(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate change = clockChange(Month.MARCH);
        String title = title("Across spring");

        var form = calendar.createEvent().title(title).expand()
            .startDate(change.minusDays(2)).startTime("09:00").endTime("10:00");
        form.repeat().frequency(RecurrenceSection.DAILY).endsAfter(5);
        form.save();

        String master = Ics.master(probe.singleEvent(user));
        assertThat(Ics.parameters(master, "DTSTART"))
            .as("a wall clock rule needs a named zone, or the clock change moves it")
            .contains("TZID");
        assertThat(Ics.property(master, "DTSTART").orElseThrow()).endsWith("T090000");
    }

    @Test
    @DisplayName("TZ-11 The autumn clock change does not shift a weekly recurring event")
    void theAutumnChangeDoesNotShiftAWeeklySeries(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate change = clockChange(Month.OCTOBER);
        String title = title("Across autumn");

        var form = calendar.createEvent().title(title).expand()
            .startDate(change.minusDays(3)).startTime("09:00").endTime("10:00");
        form.repeat().frequency(RecurrenceSection.WEEKLY).endsAfter(4);
        form.save();

        String master = Ics.master(probe.singleEvent(user));
        assertThat(Ics.parameters(master, "DTSTART")).contains("TZID");
        assertThat(Ics.property(master, "DTSTART").orElseThrow()).endsWith("T090000");
    }

    @Test
    @DisplayName("TZ-12 An event placed in the hour the spring change skips is stored as asked")
    void anEventInTheSkippedHour(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate change = clockChange(Month.MARCH);
        String title = title("Skipped hour");

        calendar.createEvent().title(title).expand()
            .startDate(change).startTime("02:30").endTime("03:30").save();

        // Europe/Paris has no 02:30 that morning; whatever the application resolves it to, it
        // must store something valid and keep the event rather than lose it
        awaitStored(probe, user, title);
        assertThat(Ics.property(Ics.event(probe.singleEvent(user)), "DTSTART").orElseThrow())
            .matches("\\d{8}T\\d{6}Z?");
    }

    @Test
    @DisplayName("TZ-13 An event placed in the hour the autumn change repeats is stored as asked")
    void anEventInTheDoubledHour(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate change = clockChange(Month.OCTOBER);
        String title = title("Doubled hour");

        calendar.createEvent().title(title).expand()
            .startDate(change).startTime("02:30").endTime("03:30").save();

        awaitStored(probe, user, title);
        assertThat(Ics.property(Ics.event(probe.singleEvent(user)), "DTSTART").orElseThrow())
            .startsWith(change.toString().replace("-", ""));
    }

    @Test
    @DisplayName("TZ-14 Changing the timezone in the settings redraws the whole grid")
    void changingTheSettingsTimezoneRedrawsTheGrid(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String morning = title("Morning");
        String evening = title("Evening");
        calendar.createEvent().title(morning).expand().startTime("08:00").endTime("09:00").save();
        calendar.createEvent().title(evening).expand().startTime("20:00").endTime("21:00").save();
        awaitAttached(calendar.eventCard(evening));
        String axisBefore = calendar.weekNumber().first().innerText();

        calendar.openSettings().selectTimezone("Pacific/Auckland").backToCalendar();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(calendar.weekNumber().first().innerText())
                .as("the axis follows the clock the user reads by")
                .isNotEqualTo(axisBefore));
    }

    @Test
    @DisplayName("TZ-15 Automatic detection picks up the browser timezone")
    void automaticDetectionPicksTheBrowserTimezone(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        // the browser context of this suite sits in Europe/Paris
        assertThat(calendar.weekNumber().first().innerText()).containsPattern("UTC[+]\\d");
        var form = calendar.createEvent().expand();
        assertThat(form.timezone()).contains("Europe/Paris");
    }

    @Test
    @DisplayName("TZ-23 A browser sitting elsewhere runs the calendar in the timezone it detects")
    void theDetectedTimezoneRunsTheCalendar(E2EUser user, E2ESessions sessions, CalendarProbe probe) {
        // this account configured no timezone of its own: the zone below can only come from
        // the browser, and must not be the fallback the backend serves to such users
        CalendarPage tokyo = sessions.openFor(user, "Asia/Tokyo");
        String title = title("Detected");

        var form = tokyo.createEvent().title(title).expand();

        assertThat(form.timezone())
            .as("the form offers the detected zone, detection being on by default")
            .contains("Asia/Tokyo");
        form.startTime("10:00").endTime("11:00").save();
        awaitAttached(tokyo.eventCard(title));
        assertThat(Ics.parameters(Ics.event(probe.singleEvent(user)), "DTSTART"))
            .as("and what reaches CalDAV is written against that same zone")
            .contains("TZID=Asia/Tokyo");
    }

    @Test
    @DisplayName("TZ-16 The banner offers to switch when the detected zone differs from the configured one")
    void theBannerOffersToSwitch(Page page, E2EUser user, RuntimeConfig config) {
        // the suite ships with the prompt off so it never steals focus: turn it back on here
        config.set("ASK_FOR_TZ_UPDATE", "true");
        CalendarPage calendar = LoginPage.loginAs(page, user);
        calendar.openSettings().selectTimezone("Pacific/Auckland").backToCalendar();

        // the alert only asks once per browser zone and remembers having asked
        page.evaluate("() => localStorage.removeItem('lastCheckedTZ')");
        page.reload();
        calendar.waitUntilLoaded();

        PlaywrightAssertions.assertThat(page.getByText(
                java.util.regex.Pattern.compile("Your browser indicates", java.util.regex.Pattern.CASE_INSENSITIVE))
                .first())
            .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(30_000));
    }

    @Test
    @DisplayName("TZ-17 Declining the switch keeps the configured timezone")
    void decliningTheSwitchKeepsTheConfiguredZone(Page page, E2EUser user, RuntimeConfig config) {
        config.set("ASK_FOR_TZ_UPDATE", "true");
        CalendarPage calendar = LoginPage.loginAs(page, user);
        calendar.openSettings().selectTimezone("Pacific/Auckland").backToCalendar();
        page.evaluate("() => localStorage.removeItem('lastCheckedTZ')");
        page.reload();
        calendar.waitUntilLoaded();
        PlaywrightAssertions.assertThat(page.getByText(
                java.util.regex.Pattern.compile("Your browser indicates", java.util.regex.Pattern.CASE_INSENSITIVE))
                .first())
            .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(30_000));

        page.getByRole(com.microsoft.playwright.options.AriaRole.BUTTON,
            new Page.GetByRoleOptions().setName(java.util.regex.Pattern.compile("^(No|Cancel|Close)$")))
            .last().click();
        page.waitForTimeout(1500);

        var form = calendar.createEvent().expand();
        assertThat(form.timezone())
            .as("saying no means keeping what the user chose")
            .contains("Auckland");
    }

    @Test
    @DisplayName("TZ-18 ASK_FOR_TZ_UPDATE=false hides the banner")
    void theBannerCanBeTurnedOff(Page page, E2EUser user, RuntimeConfig config) {
        // every condition TZ-16 needs to raise the banner is set up below; only the flag differs
        config.set("ASK_FOR_TZ_UPDATE", "false");
        CalendarPage calendar = LoginPage.loginAs(page, user);
        calendar.openSettings().selectTimezone("Pacific/Auckland").backToCalendar();

        page.evaluate("() => localStorage.removeItem('lastCheckedTZ')");
        page.reload();
        calendar.waitUntilLoaded();
        page.waitForTimeout(4000);

        PlaywrightAssertions.assertThat(page.getByText(
            java.util.regex.Pattern.compile("Your browser indicates", java.util.regex.Pattern.CASE_INSENSITIVE)))
            .hasCount(0);
    }

    @Test
    @DisplayName("TZ-19 An invitation received from another timezone displays at local time")
    void anInvitationFromAnotherTimezone(Page page, E2EUser organizer, E2EUserFactory users,
                                         E2ESessions sessions) {
        E2EUser guest = users.newUser();
        CalendarPage guestCalendar = sessions.openFor(guest);
        CalendarPage calendar = LoginPage.loginAs(page, organizer);
        String title = title("Across the world");

        calendar.createEvent().title(title).addGuest(guest.email())
            .expand().timezone("Asia/Tokyo").startTime("18:00").endTime("19:00").save();
        awaitAttached(calendar.eventCard(title));

        guestCalendar.page().reload();
        guestCalendar.waitUntilLoaded();
        PlaywrightAssertions.assertThat(guestCalendar.eventCard(title).first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(60_000));
        assertThat(guestCalendar.eventCard(title).first().innerText())
            .as("the guest reads Paris time, the organizer wrote Tokyo time")
            .doesNotContain("18:00");
    }

    @Test
    @DisplayName("TZ-20 A recurrence spanning the clock change keeps its wall clock hour")
    void aRecurrenceAcrossTheClockChange(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate change = clockChange(Month.OCTOBER);
        String title = title("Three months");

        var form = calendar.createEvent().title(title).expand()
            .startDate(change.minusWeeks(4)).startTime("09:00").endTime("10:00");
        form.repeat().frequency(RecurrenceSection.WEEKLY).endsAfter(10);
        form.save();

        String ical = probe.singleEvent(user);
        assertThat(Ics.parameters(Ics.master(ical), "DTSTART")).contains("TZID");
        assertThat(ical)
            .as("the timezone definition must travel with the event, clock change rules included")
            .contains("BEGIN:VTIMEZONE")
            .contains("BEGIN:DAYLIGHT")
            .contains("BEGIN:STANDARD");
    }

    @Test
    @DisplayName("TZ-21 A range selected in a grid far ahead of the browser is created where it was selected")
    void aRangeSelectedFarAheadOfTheBrowserIsCreatedWhereSelected(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = inTimezone(LoginPage.loginAs(page, user), TONGATAPU);
        String title = title("Early in Tonga");

        var form = calendar.selectTimeRange(E2EClock.today(ZoneId.of(TONGATAPU)), "05:00:00", "05:30:00")
            .title(title).expand();
        assertThat(form.startTime()).isEqualTo("05:00");
        assertThat(form.endTime()).isEqualTo("06:00");
        form.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() -> {
            String event = Ics.event(probe.singleEvent(user));
            assertThat(Ics.parameters(event, "DTSTART")).contains("TZID=" + TONGATAPU);
            assertThat(Ics.property(event, "DTSTART").orElseThrow()).endsWith("T050000");
            assertThat(Ics.property(event, "DTEND").orElseThrow()).endsWith("T060000");
        });
        PlaywrightAssertions.assertThat(calendar.eventCard(title).first())
            .containsText("05:00", new LocatorAssertions.ContainsTextOptions().setTimeout(30_000));
    }

    @Test
    @DisplayName("TZ-22 Editing the end of a range selected far ahead of the browser keeps the preview on the grid")
    void editingASelectionFarAheadOfTheBrowserKeepsThePreview(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = inTimezone(LoginPage.loginAs(page, user), TONGATAPU);
        String title = title("Longer in Tonga");

        var form = calendar.selectTimeRange(E2EClock.today(ZoneId.of(TONGATAPU)), "05:00:00", "05:30:00")
            .title(title).expand().endTime("07:00");

        // the draft of the grid used to read 07:00 in the zone of the browser, eleven hours earlier
        PlaywrightAssertions.assertThat(page.locator("[data-event-id='twake-draft-event']").first())
            .containsText("07:00");
        form.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() -> {
            String event = Ics.event(probe.singleEvent(user));
            assertThat(Ics.property(event, "DTSTART").orElseThrow()).endsWith("T050000");
            assertThat(Ics.property(event, "DTEND").orElseThrow()).endsWith("T070000");
        });
    }
}
