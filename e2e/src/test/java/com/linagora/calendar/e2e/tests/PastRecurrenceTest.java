package com.linagora.calendar.e2e.tests;

import static com.linagora.calendar.e2e.pages.EventFormModal.Scope.ALL_EVENTS;
import static com.linagora.calendar.e2e.pages.EventFormModal.Scope.THIS_EVENT;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
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
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.linagora.calendar.e2e.pages.RecurrenceSection;
import com.linagora.calendar.e2e.pages.ScopeDialog;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.LocatorAssertions;
import com.microsoft.playwright.assertions.PlaywrightAssertions;
import com.microsoft.playwright.options.WaitForSelectorState;

/**
 * Recurrence defects this project has already shipped. See the `PAST — Recurrence and
 * occurrences` section of e2e.md for the issue each test comes from.
 */
class PastRecurrenceTest extends TwakeCalendarE2ETest {

    private static final DateTimeFormatter LONG_DATE =
        DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy", Locale.ENGLISH);

    private static String title(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    private static String longDate(LocalDate date) {
        return date.format(LONG_DATE);
    }

    private void awaitAttached(Locator locator) {
        locator.first().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.ATTACHED));
    }

    @Test
    @DisplayName("PAST-01 (#1277) Toggling repeat produces a valid RRULE, never count 0")
    void repeatToggleProducesAValidRule(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Weekly standup");

        var form = calendar.createEvent().title(title).expand();
        form.repeat();
        form.save();
        awaitAttached(calendar.eventCard(title));

        String rrule = Ics.property(Ics.master(probe.singleEvent(user)), "RRULE").orElseThrow();
        assertThat(rrule).contains("FREQ=");
        assertThat(Ics.rulePart(rrule, "COUNT")).isNotEqualTo(java.util.Optional.of("0"));
        assertThat(Ics.rulePart(rrule, "INTERVAL").orElse("1")).isEqualTo("1");
    }

    @Test
    @DisplayName("PAST-02 (#489) Editing one instance opens it at its own date, time and timezone")
    void editingOneInstanceOpensThatInstance(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Weekly sync");
        var form = calendar.createEvent().title(title).expand().startTime("17:45").endTime("18:30");
        // the day the series really starts on, which late in the evening is not today: the form
        // opens on the next round hour, and that one has already rolled over
        LocalDate startsOn = CalendarPage.parseLongDate(form.startDate());
        form.repeat().frequency(RecurrenceSection.WEEKLY);
        form.save();
        awaitAttached(calendar.eventCard(title));

        calendar.next().next();
        LocalDate twoWeeksLater = startsOn.plusWeeks(2);
        awaitAttached(calendar.eventCard(title));

        var edited = calendar.openEvent(title).edit(THIS_EVENT).expand();

        assertThat(edited.startTime()).isEqualTo("17:45");
        assertThat(edited.startDate()).isEqualTo(longDate(twoWeeksLater));
        assertThat(edited.timezone()).contains("Europe/Paris");
    }

    @Test
    @DisplayName("PAST-03 (#938) Deleting a second occurrence does not resurrect the first one deleted")
    void deletingOccurrencesDoesNotResurrectPreviousDeletions(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Vacation");
        // from the first day of the week on screen, or the occurrences run off it on a weekend
        var form = calendar.createEvent().title(title).expand()
            .startDate(calendar.firstVisibleDate()).startTime("09:00").endTime("10:00");
        form.repeat().frequency(RecurrenceSection.DAILY).endsAfter(5);
        form.save();
        Awaitility.await().atMost(Duration.ofSeconds(30))
            .until(() -> calendar.eventCard(title).count() >= 3);
        int initial = calendar.eventCard(title).count();

        calendar.openEvent(title).delete(THIS_EVENT);
        Awaitility.await().atMost(Duration.ofSeconds(30))
            .until(() -> calendar.eventCard(title).count() == initial - 1);
        calendar.openEvent(title).delete(THIS_EVENT);
        Awaitility.await().atMost(Duration.ofSeconds(30))
            .until(() -> calendar.eventCard(title).count() == initial - 2);

        assertThat(Ics.properties(Ics.master(probe.singleEvent(user)), "EXDATE"))
            .as("both deletions must be recorded, the first one must not be dropped")
            .hasSize(2);
    }

    @Test
    @DisplayName("PAST-04 (#1004) Editing one occurrence of a series bounded by UNTIL keeps it on the grid")
    void editingAnOccurrenceOfAnUntilSeriesKeepsItVisible(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Bounded");
        // both ends inside the week on screen. Moving only the end bound is not enough: with a
        // start left on today, an end taken from the start of the week can land before it and
        // leave the series with a single occurrence.
        LocalDate weekStart = calendar.firstVisibleDate();
        var form = calendar.createEvent().title(title).expand()
            .startDate(weekStart).endDate(weekStart).startTime("09:00").endTime("10:00");
        form.repeat().frequency(RecurrenceSection.DAILY).endsOn(weekStart.plusDays(4));
        form.save();
        Awaitility.await().atMost(Duration.ofSeconds(30))
            .until(() -> calendar.eventCard(title).count() >= 2);

        String renamed = title("Bounded renamed");
        var edited = calendar.openEvent(title).edit(THIS_EVENT);
        edited.title(renamed);
        edited.save();

        PlaywrightAssertions.assertThat(calendar.eventCard(renamed).first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(30_000));
        // the untouched occurrences must still be there
        PlaywrightAssertions.assertThat(calendar.eventCard(title).first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(30_000));
    }

    @Test
    @DisplayName("PAST-05 (#819) An overridden instance is written once, in the same date-time form as DTSTART")
    void overriddenInstanceIsWrittenOnceAndConsistently(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Override");
        var form = calendar.createEvent().title(title).expand().startTime("09:00").endTime("10:00");
        form.repeat().frequency(RecurrenceSection.DAILY).endsAfter(4);
        form.save();
        awaitAttached(calendar.eventCard(title));

        var edited = calendar.openEvent(title).edit(THIS_EVENT);
        edited.title(title("Overridden"));
        edited.save();
        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(Ics.overrides(probe.singleEvent(user))).hasSize(1));

        String ical = probe.singleEvent(user);
        List<String> overrides = Ics.overrides(ical);
        assertThat(overrides).as("one edit, one override").hasSize(1);
        String override = overrides.getFirst();
        boolean startIsUtc = Ics.property(override, "DTSTART").orElseThrow().endsWith("Z");
        boolean recurrenceIdIsUtc = Ics.property(override, "RECURRENCE-ID").orElseThrow().endsWith("Z");
        assertThat(recurrenceIdIsUtc)
            .as("RECURRENCE-ID and DTSTART must use the same date-time form, or the instance identity is lost")
            .isEqualTo(startIsUtc);
    }

    @Test
    @DisplayName("PAST-06 (#466) No VEVENT ever carries both an RRULE and a RECURRENCE-ID")
    void aVeventNeverCarriesBothRruleAndRecurrenceId(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Mixed");
        var form = calendar.createEvent().title(title).expand().startTime("09:00").endTime("10:00");
        form.repeat().frequency(RecurrenceSection.WEEKLY);
        form.save();
        awaitAttached(calendar.eventCard(title));

        var edited = calendar.openEvent(title).edit(THIS_EVENT);
        edited.expand().startTime("14:00");
        edited.save();
        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(Ics.overrides(probe.singleEvent(user))).isNotEmpty());

        assertThat(Ics.vevents(probe.singleEvent(user)))
            .allSatisfy(vevent -> assertThat(
                Ics.property(vevent, "RRULE").isPresent() && Ics.property(vevent, "RECURRENCE-ID").isPresent())
                .as("a VEVENT holding both is not valid iCalendar")
                .isFalse());
    }

    @Test
    @DisplayName("PAST-07 (#748) A series ending on a date writes an RFC 5545 compliant UNTIL")
    void untilIsWrittenAtTheRightPrecision(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Until");
        var form = calendar.createEvent().title(title).expand().startTime("09:00").endTime("10:00");
        form.repeat().frequency(RecurrenceSection.DAILY).endsOn(E2EClock.today().plusDays(6));
        form.save();
        awaitAttached(calendar.eventCard(title));

        String master = Ics.master(probe.singleEvent(user));
        String until = Ics.rulePart(Ics.property(master, "RRULE").orElseThrow(), "UNTIL").orElseThrow();
        if (Ics.parameters(master, "DTSTART").contains("TZID")) {
            assertThat(until)
                .as("RFC 5545: with a DTSTART in a named timezone, UNTIL must be a UTC date-time")
                .matches("\\d{8}T\\d{6}Z");
        } else {
            assertThat(until).matches("\\d{8}(T\\d{6}Z?)?");
        }
    }

    @Test
    @DisplayName("PAST-08 (#860) Editing a series whose rule carries WKST does not fail")
    void editingASeriesCarryingWkstSucceeds(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String uid = UUID.randomUUID().toString();
        String title = "Wkst series";
        String stamp = E2EClock.today().toString().replace("-", "");
        probe.putEvent(user, uid, """
            BEGIN:VCALENDAR
            VERSION:2.0
            PRODID:-//linagora//twake-calendar-e2e//EN
            BEGIN:VEVENT
            UID:%s
            DTSTAMP:%sT080000Z
            DTSTART:%sT080000Z
            DTEND:%sT090000Z
            RRULE:FREQ=WEEKLY;INTERVAL=1;WKST=MO;COUNT=4
            SUMMARY:%s
            END:VEVENT
            END:VCALENDAR
            """.formatted(uid, stamp, stamp, stamp, title).replace("\n", "\r\n"));
        page.reload();
        calendar.waitUntilLoaded();
        awaitAttached(calendar.eventCard(title));

        String renamed = title("Wkst renamed");
        var edited = calendar.openEvent(title).edit(ALL_EVENTS);
        edited.title(renamed);
        edited.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(probe.singleEvent(user))
                .as("the CalDAV write must go through, WKST must not be serialized as a number")
                .contains("SUMMARY:" + renamed));
    }

    @Test
    @DisplayName("PAST-09 (#1217) Deleting an occurrence increments the SEQUENCE of the master")
    void deletingAnOccurrenceIncrementsTheSequence(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Sequence");
        var form = calendar.createEvent().title(title).expand().startTime("09:00").endTime("10:00");
        form.repeat().frequency(RecurrenceSection.DAILY).endsAfter(4);
        form.save();
        awaitAttached(calendar.eventCard(title));
        int before = Integer.parseInt(Ics.property(Ics.master(probe.singleEvent(user)), "SEQUENCE").orElse("0"));

        calendar.openEvent(title).delete(THIS_EVENT);

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() -> {
            String master = Ics.master(probe.singleEvent(user));
            assertThat(Ics.properties(master, "EXDATE")).isNotEmpty();
            assertThat(Integer.parseInt(Ics.property(master, "SEQUENCE").orElse("0")))
                .as("the organizer must bump SEQUENCE so guests can order the updates")
                .isGreaterThan(before);
        });
    }

    @Test
    @DisplayName("PAST-10 (#352) A title only change on the series keeps its exceptions")
    void renamingTheSeriesKeepsItsExceptions(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        // seeded rather than built through the UI, so the exception is known good before we start
        String uid = UUID.randomUUID().toString();
        String title = "Seeded series";
        String exception = "Moved occurrence";
        String today = E2EClock.today().toString().replace("-", "");
        String tomorrow = E2EClock.today().plusDays(1).toString().replace("-", "");
        probe.putEvent(user, uid, """
            BEGIN:VCALENDAR
            VERSION:2.0
            PRODID:-//linagora//twake-calendar-e2e//EN
            BEGIN:VEVENT
            UID:%s
            DTSTAMP:%sT080000Z
            DTSTART:%sT080000Z
            DTEND:%sT090000Z
            RRULE:FREQ=DAILY;COUNT=5
            SUMMARY:%s
            END:VEVENT
            BEGIN:VEVENT
            UID:%s
            RECURRENCE-ID:%sT080000Z
            DTSTAMP:%sT080000Z
            DTSTART:%sT130000Z
            DTEND:%sT140000Z
            SUMMARY:%s
            END:VEVENT
            END:VCALENDAR
            """.formatted(uid, today, today, today, title,
            uid, tomorrow, today, tomorrow, tomorrow, exception).replace("\n", "\r\n"));
        page.reload();
        calendar.waitUntilLoaded();
        awaitAttached(calendar.eventCard(title));
        assertThat(Ics.overrides(probe.singleEvent(user))).hasSize(1);

        String renamed = title("Seeded renamed");
        var whole = calendar.openEvent(title).edit(ALL_EVENTS);
        whole.title(renamed);
        whole.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(probe.singleEvent(user)).contains("SUMMARY:" + renamed));

        // #352 asks for both halves: the exceptions are kept, and all the titles are updated.
        String ical = probe.singleEvent(user);
        assertThat(Ics.overrides(ical))
            .as("a title only change must not scratch the override")
            .isNotEmpty();
        assertThat(Ics.overrides(ical))
            .as("what makes it an exception -- its own 13:00 start -- must be preserved")
            .anySatisfy(override -> assertThat(Ics.property(override, "DTSTART").orElseThrow())
                .endsWith("T130000Z"));
        assertThat(Ics.property(Ics.master(ical), "SUMMARY")).hasValue(renamed);
    }

    @Test
    @DisplayName("PAST-11 (#229) Accepting a series that holds an exception does not overwrite it")
    void acceptingASeriesKeepsItsExceptions(Page page, E2EUser organizer, E2EUserFactory users,
                                            E2ESessions sessions, CalendarProbe probe) {
        E2EUser guest = users.newUser();
        CalendarPage guestCalendar = sessions.openFor(guest);
        CalendarPage calendar = LoginPage.loginAs(page, organizer);

        String title = title("Shared series");
        // from the first day of the week on screen, or the occurrences run off it on a weekend
        var form = calendar.createEvent().title(title).addGuest(guest.email())
            .expand().startDate(calendar.firstVisibleDate()).startTime("09:00").endTime("10:00");
        form.repeat().frequency(RecurrenceSection.DAILY).endsAfter(4);
        form.save();
        awaitAttached(calendar.eventCard(title));

        String exception = title("Moved occurrence");
        var occurrence = calendar.openEvent(title).edit(THIS_EVENT);
        occurrence.title(exception);
        occurrence.save();
        Awaitility.await().atMost(Duration.ofSeconds(60)).untilAsserted(() ->
            assertThat(Ics.overrides(probe.singleEvent(guest)))
                .as("the guest must receive the exception along with the series")
                .isNotEmpty());

        guestCalendar.page().reload();
        guestCalendar.waitUntilLoaded();
        guestCalendar.openEvent(title).answer("Yes", ALL_EVENTS);

        Awaitility.await().atMost(Duration.ofSeconds(60)).untilAsserted(() -> {
            String ical = probe.singleEvent(guest);
            assertThat(ical).contains("PARTSTAT=ACCEPTED");
            assertThat(Ics.overrides(ical))
                .as("answering an invitation must not wipe the exceptions of the series")
                .isNotEmpty();
        });
    }

    @Test
    @DisplayName("PAST-12 (#299) Inviting someone on one occurrence keeps the other answers on it")
    void invitingOnOneOccurrenceKeepsTheOtherAnswers(Page page, E2EUser organizer,
                                                     E2EUserFactory users, E2ESessions sessions,
                                                     CalendarProbe probe) {
        E2EUser alice = users.newUser("alice");
        E2EUser cedric = users.newUser("cedric");
        CalendarPage aliceCalendar = sessions.openFor(alice);
        CalendarPage calendar = LoginPage.loginAs(page, organizer);

        String title = title("Weekly with alice");
        var form = calendar.createEvent().title(title).addGuest(alice.email())
            .expand().startTime("09:00").endTime("10:00");
        form.repeat().frequency(RecurrenceSection.WEEKLY);
        form.save();
        awaitAttached(calendar.eventCard(title));

        aliceCalendar.page().reload();
        aliceCalendar.waitUntilLoaded();
        aliceCalendar.openEvent(title).answer("Yes", ALL_EVENTS);
        Awaitility.await().atMost(Duration.ofSeconds(60)).untilAsserted(() ->
            assertThat(probe.singleEvent(organizer))
                .as("the organizer must see alice's answer before we touch an occurrence")
                .contains("PARTSTAT=ACCEPTED"));

        page.reload();
        calendar.waitUntilLoaded();
        calendar.next();
        awaitAttached(calendar.eventCard(title));
        var occurrence = calendar.openEvent(title).edit(THIS_EVENT);
        occurrence.addGuest(cedric.email());
        occurrence.save();

        Awaitility.await().atMost(Duration.ofSeconds(60)).untilAsserted(() -> {
            String override = Ics.overrides(probe.singleEvent(organizer)).getFirst();
            assertThat(override).contains(cedric.email());
            assertThat(override.replaceAll("\\s+", ""))
                .as("alice already accepted, inviting cedric must not reset her answer")
                .contains("PARTSTAT=ACCEPTED");
        });
    }

    @Test
    @DisplayName("PAST-13 (#364) Turning a series into a simple event stops offering the scope dialog")
    void turningASeriesIntoASimpleEventDropsTheScopeDialog(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Was recurring");
        var form = calendar.createEvent().title(title).expand()
            .startDate(calendar.firstVisibleDate()).startTime("09:00").endTime("10:00");
        form.repeat().frequency(RecurrenceSection.DAILY).endsAfter(3);
        form.save();
        awaitAttached(calendar.eventCard(title));

        var edited = calendar.openEvent(title).edit(ALL_EVENTS);
        edited.expand().doesNotRepeat();
        edited.save();
        Awaitility.await().atMost(Duration.ofSeconds(30))
            .until(() -> calendar.eventCard(title).count() == 1);

        calendar.openEvent(title).clickEdit();
        page.waitForTimeout(1500);

        assertThat(ScopeDialog.isShowing(page))
            .as("the event is no longer recurring, there is nothing to scope")
            .isFalse();
    }

    @Test
    @DisplayName("PAST-14 (#263) A daily series shows on the spill-over days of the month view")
    void aDailySeriesShowsOnTheSpillOverDaysOfTheMonthView(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Every day");
        var form = calendar.createEvent().title(title).expand().startTime("09:00").endTime("10:00");
        form.repeat().frequency(RecurrenceSection.DAILY).endsNever();
        form.save();
        awaitAttached(calendar.eventCard(title));

        calendar.switchView("Month");

        // the trailing days of a month grid belong to the next month: they must be loaded too,
        // which is exactly what #263 got wrong
        java.time.LocalDate endOfMonth = E2EClock.today().withDayOfMonth(E2EClock.today().lengthOfMonth());
        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(calendar.eventDates(title))
                .as("a daily series must reach the spill over days of the month view")
                .anySatisfy(date -> assertThat(LocalDate.parse(date)).isAfter(endOfMonth)));
    }

    @Test
    @DisplayName("PAST-15 (#441) Changing the interval of a series keeps the master occurrence visible")
    void changingTheIntervalKeepsTheMasterVisible(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Interval");
        var form = calendar.createEvent().title(title).expand().startTime("09:00").endTime("10:00");
        form.repeat().frequency(RecurrenceSection.DAILY).every(1).endsAfter(3);
        form.save();
        awaitAttached(calendar.eventCard(title));

        var edited = calendar.openEvent(title).edit(ALL_EVENTS);
        edited.expand().repeat().every(2);
        edited.save();

        page.reload();
        calendar.waitUntilLoaded();
        // the first occurrence must survive a rule change
        PlaywrightAssertions.assertThat(calendar.eventCard(title).first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(30_000));
    }

    @Test
    @DisplayName("PAST-16 (#916) Editing a single occurrence does not offer to move it to another calendar")
    void editingOneOccurrenceDoesNotOfferToMoveIt(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("No move");
        var form = calendar.createEvent().title(title).expand().startTime("09:00").endTime("10:00");
        form.repeat().frequency(RecurrenceSection.DAILY).endsAfter(3);
        form.save();
        awaitAttached(calendar.eventCard(title));

        var edited = calendar.openEvent(title).edit(THIS_EVENT);
        edited.expand();

        assertThat(edited.canMoveToAnotherCalendar())
            .as("moving a single occurrence to another calendar is not a valid operation")
            .isFalse();
    }

    @Test
    @DisplayName("PAST-17 (#442) The preview of a recurring event states its rule")
    void thePreviewStatesTheRecurrenceRule(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Told");
        var form = calendar.createEvent().title(title).expand().startTime("09:00").endTime("10:00");
        form.repeat().frequency(RecurrenceSection.DAILY).every(2).endsAfter(3);
        form.save();
        awaitAttached(calendar.eventCard(title));

        String preview = calendar.openEvent(title).text();

        assertThat(preview).contains("Recurrent Event");
        assertThat(preview).containsIgnoringCase("2");
        assertThat(preview).containsIgnoringCase("day");
    }

    @Test
    @DisplayName("PAST-18 (#961) The recurrence interval never accepts a float")
    void theRecurrenceIntervalRefusesAFloat(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        var form = calendar.createEvent().title(title("Float")).expand();
        RecurrenceSection recurrence = form.repeat();
        recurrence.intervalInput().fill("");
        recurrence.intervalInput().pressSequentially("1.5");

        assertThat(recurrence.intervalInput().inputValue())
            .as("a fractional interval has no meaning in an RRULE")
            .doesNotContain(".");
    }
}
