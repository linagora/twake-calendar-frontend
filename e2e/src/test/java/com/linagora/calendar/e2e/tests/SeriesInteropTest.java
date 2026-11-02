package com.linagora.calendar.e2e.tests;

import static com.linagora.calendar.e2e.pages.EventFormModal.Scope.ALL_EVENTS;
import static com.linagora.calendar.e2e.pages.EventFormModal.Scope.THIS_EVENT;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.CalendarProbe;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.backend.E2EUserFactory;
import com.linagora.calendar.e2e.backend.Ics;
import com.linagora.calendar.e2e.backend.Vcal;
import com.linagora.calendar.e2e.docker.E2EClock;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.EventFormModal;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.WaitForSelectorState;

/**
 * Series written by other clients: Outlook's Windows zone names, overrides moved to another
 * zone, rules the form does not model, zones named like JavaScript object members.
 *
 * <p>The series start today, a Wednesday whose week lies within its month, so every occurrence
 * a test touches is on screen.
 */
class SeriesInteropTest extends TwakeCalendarE2ETest {
    private static final Duration SAVED = Duration.ofSeconds(30);
    private static final String STAMP = "DTSTAMP:20260101T000000Z";
    private static final String ROMANCE = "Romance Standard Time";

    // Read once the extension started the clock of the test: a field initializer runs before,
    // on the real date, which may lie outside the week the browser shows
    private LocalDate today;
    private LocalDate tomorrow;
    private String day0;
    private String day1;

    @BeforeEach
    void readTheClockOfTheTest() {
        today = E2EClock.today();
        tomorrow = today.plusDays(1);
        day0 = Vcal.day(today);
        day1 = Vcal.day(tomorrow);
    }

    private static String title(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    private void awaitAttached(Locator locator) {
        locator.first().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.ATTACHED));
    }

    private CalendarPage seed(Page page, E2EUser user, CalendarProbe probe, String title,
                              String icalendar) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        probe.putEvent(user, UUID.randomUUID().toString(), icalendar);
        calendar.reload();
        awaitAttached(calendar.eventCard(title));
        return calendar;
    }

    private String renameAndAwait(EventFormModal form, E2EUser user, CalendarProbe probe,
                                  String renamed) {
        form.title(renamed);
        form.save();
        Awaitility.await().atMost(SAVED).untilAsserted(() ->
            assertThat(probe.singleEvent(user)).contains("SUMMARY:" + renamed));
        return probe.singleEvent(user);
    }

    /** A daily series of three occurrences from today, 09:00 in the given zone. */
    private String dailyMaster(String uid, String tzid, String title, String... extraLines) {
        return """
            BEGIN:VEVENT
            UID:%s
            %s
            DTSTART;TZID=%s:%sT090000
            DTEND;TZID=%s:%sT100000
            RRULE:FREQ=DAILY;COUNT=3
            SUMMARY:%s
            %sEND:VEVENT
            """.formatted(uid, STAMP, tzid, day0, tzid, day0, title, lines(extraLines));
    }

    private static String lines(String... lines) {
        return lines.length == 0 ? "" : String.join("\n", lines) + "\n";
    }

    private static String invited(E2EUser organizer, E2EUser user) {
        return "ORGANIZER:mailto:" + organizer.email() + "\n"
            + "ATTENDEE;PARTSTAT=ACCEPTED:mailto:" + organizer.email() + "\n"
            + "ATTENDEE;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:" + user.email();
    }

    @Test
    @DisplayName("SERIES-INTEROP-01 (#1898) A DATE-TIME UNTIL survives an \"All the events\" edit")
    void aDateTimeUntilSurvivesASeriesEdit(Page page, E2EUser user, CalendarProbe probe) {
        String title = title("Until");
        String until = Vcal.day(today.plusDays(2)) + "T225959Z";
        CalendarPage calendar = seed(page, user, probe, title, Vcal.calendar(
            Vcal.centralEuropeanZone("Europe/Paris"), """
            BEGIN:VEVENT
            UID:%s
            %s
            DTSTART;TZID=Europe/Paris:%sT090000
            DTEND;TZID=Europe/Paris:%sT100000
            RRULE:FREQ=DAILY;UNTIL=%s
            SUMMARY:%s
            END:VEVENT
            """.formatted(UUID.randomUUID(), STAMP, day0, day0, until, title)));

        String saved = renameAndAwait(calendar.openEventOn(title, today).edit(ALL_EVENTS), user, probe,
            title("Until renamed"));

        String rrule = Ics.property(Ics.master(saved), "RRULE").orElseThrow();
        assertThat(Ics.rulePart(rrule, "UNTIL").orElseThrow())
            .as("a rename must write the end of the series back, not 'Invalid date' (%s)", rrule)
            .startsWith(Vcal.day(today.plusDays(2)))
            .matches("\\d{8}(T\\d{6}Z)?");
    }

    @Test
    @DisplayName("SERIES-INTEROP-02 (#1899) BYSETPOS survives an \"All the events\" edit")
    void bySetPosSurvivesASeriesEdit(Page page, E2EUser user, CalendarProbe probe) {
        String title = title("Nth weekday");
        String weekday = today.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH)
            .substring(0, 2).toUpperCase(Locale.ROOT);
        int nth = (today.getDayOfMonth() - 1) / 7 + 1;
        // what Outlook writes for "the second Wednesday of every month"
        String rule = "FREQ=MONTHLY;BYDAY=" + weekday + ";BYSETPOS=" + nth;
        CalendarPage calendar = seed(page, user, probe, title, Vcal.calendar(
            Vcal.centralEuropeanZone("Europe/Paris"), """
            BEGIN:VEVENT
            UID:%s
            %s
            DTSTART;TZID=Europe/Paris:%sT090000
            DTEND;TZID=Europe/Paris:%sT100000
            RRULE:%s
            SUMMARY:%s
            END:VEVENT
            """.formatted(UUID.randomUUID(), STAMP, day0, day0, rule, title)));

        String saved = renameAndAwait(calendar.openEventOn(title, today).edit(ALL_EVENTS), user, probe,
            title("Nth renamed"));

        String rrule = Ics.property(Ics.master(saved), "RRULE").orElseThrow();
        assertThat(Ics.rulePart(rrule, "BYSETPOS"))
            .as("without BYSETPOS the series falls on every %s of the month (%s)", weekday, rrule)
            .hasValue(String.valueOf(nth));
        assertThat(Ics.rulePart(rrule, "FREQ")).hasValue("MONTHLY");
    }

    @Test
    @DisplayName("SERIES-INTEROP-03 (#1908) A weekly series starting outside its BYDAY keeps its start")
    void aSeriesStartingOutsideItsDaysKeepsItsStart(Page page, E2EUser user, CalendarProbe probe) {
        String title = title("Offday");
        String thursday = tomorrow.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH)
            .substring(0, 2).toUpperCase(Locale.ROOT);
        CalendarPage calendar = seed(page, user, probe, title, Vcal.calendar(
            Vcal.centralEuropeanZone("Europe/Paris"), """
            BEGIN:VEVENT
            UID:%s
            %s
            DTSTART;TZID=Europe/Paris:%sT090000
            DTEND;TZID=Europe/Paris:%sT100000
            RRULE:FREQ=WEEKLY;BYDAY=%s;COUNT=3
            SUMMARY:%s
            END:VEVENT
            """.formatted(UUID.randomUUID(), STAMP, day0, day0, thursday, title)));
        awaitAttached(calendar.eventCardOn(title, tomorrow));

        String saved = renameAndAwait(calendar.openEventOn(title, tomorrow).edit(ALL_EVENTS), user,
            probe, title("Offday renamed"));

        assertThat(Ics.property(Ics.master(saved), "DTSTART").orElseThrow())
            .as("RFC 5545 counts DTSTART as the first occurrence: a rename must not drop it")
            .startsWith(day0);
    }

    @Test
    @DisplayName("SERIES-INTEROP-04 (#1881) Editing one occurrence keeps the VTIMEZONE of an override in another zone")
    void anOccurrenceEditKeepsEveryVtimezone(Page page, E2EUser user, CalendarProbe probe) {
        String title = title("Tokyo");
        String uid = UUID.randomUUID().toString();
        CalendarPage calendar = seed(page, user, probe, title, Vcal.calendar(
            Vcal.centralEuropeanZone("Europe/Paris"),
            Vcal.fixedZone("Asia/Tokyo", "+0900"),
            dailyMaster(uid, "Europe/Paris", title), """
            BEGIN:VEVENT
            UID:%s
            %s
            RECURRENCE-ID;TZID=Europe/Paris:%sT090000
            DTSTART;TZID=Asia/Tokyo:%sT170000
            DTEND;TZID=Asia/Tokyo:%sT180000
            SUMMARY:%s
            END:VEVENT
            """.formatted(uid, STAMP, day1, day1, day1, title("Moved to Tokyo"))));

        String saved = renameAndAwait(
            calendar.openEventOn(title, today.plusDays(2)).edit(THIS_EVENT), user, probe,
            title("Tokyo edited"));

        assertThat(Vcal.vtimezoneIds(saved))
            .as("every TZID of the object keeps its definition")
            .contains("Europe/Paris", "Asia/Tokyo");
    }

    @Test
    @DisplayName("SERIES-INTEROP-05 (#1882) Editing an occurrence moved to another zone replaces its override")
    void editingAnOccurrenceMovedToAnotherZoneReplacesIt(Page page, E2EUser user, CalendarProbe probe) {
        String title = title("Weekly");
        String moved = title("Moved to New York");
        String uid = UUID.randomUUID().toString();
        CalendarPage calendar = seed(page, user, probe, moved, Vcal.calendar(
            Vcal.centralEuropeanZone("Europe/Paris"),
            Vcal.fixedZone("America/New_York", "-0500"),
            dailyMaster(uid, "Europe/Paris", title), """
            BEGIN:VEVENT
            UID:%s
            %s
            RECURRENCE-ID;TZID=Europe/Paris:%sT090000
            DTSTART;TZID=America/New_York:%sT090000
            DTEND;TZID=America/New_York:%sT100000
            SUMMARY:%s
            END:VEVENT
            """.formatted(uid, STAMP, day1, day1, day1, moved)));

        String renamed = title("New York edited");
        String saved = renameAndAwait(calendar.openEventOn(moved, tomorrow).edit(THIS_EVENT), user,
            probe, renamed);

        List<String> overrides = Ics.overrides(saved);
        assertThat(overrides)
            .as("the edit replaces the override, it does not add one at another instant")
            .singleElement()
            .satisfies(override -> assertThat(Ics.property(override, "SUMMARY")).hasValue(renamed));
        assertThat(Ics.property(overrides.getFirst(), "RECURRENCE-ID").orElseThrow())
            .isEqualTo(day1 + "T090000");
    }

    @Test
    @DisplayName("SERIES-INTEROP-06 (#1884) Editing a moved Outlook occurrence replaces its override")
    void editingAMovedOutlookOccurrenceReplacesIt(Page page, E2EUser user, CalendarProbe probe) {
        String title = title("Outlook weekly");
        String moved = title("Outlook moved");
        String uid = UUID.randomUUID().toString();
        CalendarPage calendar = seed(page, user, probe, moved, Vcal.calendar(
            Vcal.centralEuropeanZone(ROMANCE),
            dailyMaster(uid, ROMANCE, title), """
            BEGIN:VEVENT
            UID:%s
            %s
            RECURRENCE-ID;TZID=%s:%sT090000
            DTSTART;TZID=%s:%sT130000
            DTEND;TZID=%s:%sT140000
            SUMMARY:%s
            END:VEVENT
            """.formatted(uid, STAMP, ROMANCE, day1, ROMANCE, day1, ROMANCE, day1, moved)));

        String renamed = title("Outlook edited");
        String saved = renameAndAwait(calendar.openEventOn(moved, tomorrow).edit(THIS_EVENT), user,
            probe, renamed);

        assertThat(Ics.overrides(saved))
            .as("a second override with the same RECURRENCE-ID is a duplicate the server rejects")
            .singleElement()
            .satisfies(override -> assertThat(Ics.property(override, "SUMMARY")).hasValue(renamed));
    }

    @Test
    @DisplayName("SERIES-INTEROP-07 (#1883) Accepting a whole Outlook series keeps its VTIMEZONE")
    void acceptingAnOutlookSeriesKeepsItsVtimezone(Page page, E2EUser user, E2EUserFactory users,
                                                   CalendarProbe probe) {
        E2EUser organizer = users.newUser("organizer");
        String title = title("Outlook invitation");
        CalendarPage calendar = seed(page, user, probe, title, Vcal.calendar(
            Vcal.centralEuropeanZone(ROMANCE),
            dailyMaster(UUID.randomUUID().toString(), ROMANCE, title, invited(organizer, user))));

        calendar.openEventOn(title, today).answer("Yes", ALL_EVENTS);

        Awaitility.await().atMost(SAVED).untilAsserted(() -> {
            String saved = probe.singleEvent(user);
            assertThat(Vcal.attendeeLines(Ics.master(saved), user.email())).singleElement()
                .satisfies(line -> assertThat(Vcal.partstat(line)).isEqualTo("ACCEPTED"));
            assertThat(Vcal.vtimezoneIds(saved))
                .as("the series still says when Romance Standard Time is")
                .contains(ROMANCE);
        });
    }

    @Test
    @DisplayName("SERIES-INTEROP-08 (#1887) A whole series in a zone named toString can be accepted")
    void aSeriesInAZoneNamedToStringCanBeAccepted(Page page, E2EUser user, E2EUserFactory users,
                                                  CalendarProbe probe) {
        E2EUser organizer = users.newUser("organizer");
        String title = title("ToString zone");
        CalendarPage calendar = seed(page, user, probe, title, Vcal.calendar(
            Vcal.fixedZone("toString", "+0100"),
            dailyMaster(UUID.randomUUID().toString(), "toString", title, invited(organizer, user))));

        calendar.openEventOn(title, today).answer("Yes", ALL_EVENTS);

        Awaitility.await().atMost(SAVED).untilAsserted(() ->
            assertThat(Vcal.attendeeLines(Ics.master(probe.singleEvent(user)), user.email()))
                .as("the answer reached the server")
                .singleElement()
                .satisfies(line -> assertThat(Vcal.partstat(line)).isEqualTo("ACCEPTED")));
    }

    @Test
    @DisplayName("SERIES-INTEROP-09 (#1888) One occurrence of a series in a zone named constructor can be accepted")
    void anOccurrenceInAZoneNamedConstructorCanBeAccepted(Page page, E2EUser user,
                                                          E2EUserFactory users, CalendarProbe probe) {
        E2EUser organizer = users.newUser("organizer");
        String title = title("Constructor zone");
        CalendarPage calendar = seed(page, user, probe, title, Vcal.calendar(
            Vcal.fixedZone("constructor", "+0100"),
            dailyMaster(UUID.randomUUID().toString(), "constructor", title, invited(organizer, user))));

        calendar.openEventOn(title, tomorrow).answer("Yes", THIS_EVENT);

        Awaitility.await().atMost(SAVED).untilAsserted(() ->
            assertThat(Vcal.attendeeLines(probe.singleEvent(user), user.email()))
                .as("the answer to that occurrence reached the server")
                .anySatisfy(line -> assertThat(Vcal.partstat(line)).isEqualTo("ACCEPTED")));
    }

    @Test
    @DisplayName("SERIES-INTEROP-10 (#1887) One occurrence of a series in a zone named toString can be edited")
    void anOccurrenceInAZoneNamedToStringCanBeEdited(Page page, E2EUser user, CalendarProbe probe) {
        String title = title("ToString series");
        CalendarPage calendar = seed(page, user, probe, title, Vcal.calendar(
            Vcal.fixedZone("toString", "+0100"),
            dailyMaster(UUID.randomUUID().toString(), "toString", title)));

        String renamed = title("ToString edited");
        String saved = renameAndAwait(calendar.openEventOn(title, tomorrow).edit(THIS_EVENT), user,
            probe, renamed);

        assertThat(Ics.overrides(saved)).singleElement()
            .satisfies(override -> assertThat(Ics.property(override, "SUMMARY")).hasValue(renamed));
    }

    @Test
    @DisplayName("SERIES-INTEROP-11 (#1886) An invitation listing the user with a padded address is answered in place")
    void aPaddedAttendeeAddressIsAnsweredInPlace(Page page, E2EUser user, E2EUserFactory users,
                                                 CalendarProbe probe) {
        E2EUser organizer = users.newUser("organizer");
        String title = title("Padded");
        CalendarPage calendar = seed(page, user, probe, title, Vcal.calendar("""
            BEGIN:VEVENT
            UID:%s
            %s
            DTSTART:%sT080000Z
            DTEND:%sT090000Z
            SUMMARY:%s
            ORGANIZER:mailto:%s
            ATTENDEE;PARTSTAT=ACCEPTED:mailto:%s
            ATTENDEE;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto: %s
            X-E2E-CUSTOM:kept-across-answers
            END:VEVENT
            """.formatted(UUID.randomUUID(), STAMP, day0, day0, title, organizer.email(),
            organizer.email(), user.email())));

        calendar.openEvent(title).answer("Yes");

        Awaitility.await().atMost(SAVED).untilAsserted(() -> {
            String saved = probe.singleEvent(user);
            assertThat(Vcal.attendeeLines(saved, user.email())).singleElement()
                .satisfies(line -> assertThat(Vcal.partstat(line)).isEqualTo("ACCEPTED"));
            assertThat(saved)
                .as("patched in place, not regenerated from the form, which drops what it does not model")
                .contains("X-E2E-CUSTOM:kept-across-answers");
        });
    }
}
