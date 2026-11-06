package com.linagora.calendar.e2e.tests;

import static com.linagora.calendar.e2e.pages.EventFormModal.Scope.ALL_EVENTS;
import static com.linagora.calendar.e2e.pages.EventFormModal.Scope.THIS_EVENT;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.CalendarProbe;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.backend.Ics;
import com.linagora.calendar.e2e.backend.Vcal;
import com.linagora.calendar.e2e.docker.E2EClock;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.EventFormModal;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.linagora.calendar.e2e.pages.ScopeDialog;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.WaitForSelectorState;

/**
 * Objects in a zone only their own VTIMEZONE defines, as Outlook writes them: the name means
 * nothing to the browser, and every reading of a date has to go through the stored definition.
 */
class CustomZoneSeriesTest extends TwakeCalendarE2ETest {
    private static final Duration SAVED = Duration.ofSeconds(30);
    private static final String STAMP = "DTSTAMP:20260101T000000Z";
    private static final String CUSTOM_ZONE = "Customized Time Zone";
    private static final DateTimeFormatter LOCAL_DATE_TIME = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss");

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

    private static String byDay(LocalDate date) {
        return date.getDayOfWeek().name().substring(0, 2);
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

    @Test
    @DisplayName("CUSTOM-ZONE-01 (#1941) Renaming a whole series does not move its occurrences")
    void aRenameDoesNotMoveTheSeries(Page page, E2EUser user, CalendarProbe probe) {
        String title = title("Custom zone");
        CalendarPage calendar = seed(page, user, probe, title, Vcal.calendar(
            Vcal.fixedZone(CUSTOM_ZONE, "-0500"), """
            BEGIN:VEVENT
            UID:%s
            %s
            DTSTART;TZID=%s:%sT090000
            DTEND;TZID=%s:%sT100000
            RRULE:FREQ=DAILY;COUNT=3
            SUMMARY:%s
            END:VEVENT
            """.formatted(UUID.randomUUID(), STAMP, CUSTOM_ZONE, day0, CUSTOM_ZONE, day0, title)));

        String saved = renameAndAwait(calendar.openEventOn(title, today).edit(ALL_EVENTS), user, probe,
            title("Custom zone renamed"));

        String master = Ics.master(saved);
        // The form only offers the zones the browser knows, and shows this one in UTC: the save
        // writes the same instant in UTC, until it keeps the custom zone. Both forms are right.
        String sameInstant = Ics.parameters(master, "DTSTART").contains("TZID=" + CUSTOM_ZONE)
            ? day0 + "T090000"
            : day0 + "T140000";
        assertThat(Ics.property(master, "DTSTART"))
            .as("a rename must not move every occurrence by the offset of the zone")
            .hasValue(sameInstant);
    }

    @Test
    @DisplayName("CUSTOM-ZONE-02 (#1941) Dragging a whole series across midnight of its zone moves its weekday")
    void aDragAcrossMidnightOfTheZoneMovesTheWeekday(Page page, E2EUser user, CalendarProbe probe) {
        String title = title("Late series");
        // Yesterday 22:00 at UTC-11 is this morning for the browser: the drag stays within one day
        // of the grid and of UTC, and only the zone of the series sees it reach the next day
        LocalDate yesterday = today.minusDays(1);
        String startDay = Vcal.day(yesterday);
        CalendarPage calendar = seed(page, user, probe, title, Vcal.calendar(
            Vcal.fixedZone(CUSTOM_ZONE, "-1100"), """
            BEGIN:VEVENT
            UID:%s
            %s
            DTSTART;TZID=%s:%sT220000
            DTEND;TZID=%s:%sT223000
            RRULE:FREQ=WEEKLY;BYDAY=%s;COUNT=3
            SUMMARY:%s
            END:VEVENT
            """.formatted(UUID.randomUUID(), STAMP, CUSTOM_ZONE, startDay, CUSTOM_ZONE, startDay, byDay(yesterday), title)));
        LocalDateTime dropped = today.atTime(13, 0).atZone(E2EClock.BROWSER_ZONE)
            .withZoneSameInstant(ZoneOffset.ofHours(-11)).toLocalDateTime();

        calendar.dragEventToSlot(title, today, "13:00:00");
        ScopeDialog.waitFor(page).allEvents();

        Awaitility.await().atMost(SAVED).untilAsserted(() -> {
            String master = Ics.master(probe.singleEvent(user));
            assertThat(Ics.property(master, "DTSTART")).hasValue(dropped.format(LOCAL_DATE_TIME));
            assertThat(Ics.parameters(master, "DTSTART")).contains("TZID=" + CUSTOM_ZONE);
            assertThat(Ics.rulePart(Ics.property(master, "RRULE").orElseThrow(), "BYDAY"))
                .as("in the zone of the series, the occurrences now fall on the weekday of the drop")
                .hasValue(byDay(dropped.toLocalDate()));
        });
    }

    @Test
    @DisplayName("CUSTOM-ZONE-03 (#1977) Editing one occurrence replaces its own override, not the one with its UTC wall clock")
    void anOccurrenceEditReplacesItsOwnOverride(Page page, E2EUser user, CalendarProbe probe) {
        String title = title("Shifts");
        String first = title("First shift");
        String second = title("Second shift");
        String uid = UUID.randomUUID().toString();
        // 10:00 at UTC+1, the instant of the second override, is 09:00Z: the very wall clock
        // of the RECURRENCE-ID of the first one
        CalendarPage calendar = seed(page, user, probe, second, Vcal.calendar(
            Vcal.fixedZone(CUSTOM_ZONE, "+0100"), """
            BEGIN:VEVENT
            UID:%1$s
            %2$s
            DTSTART;TZID=%3$s:%4$sT090000
            DTEND;TZID=%3$s:%4$sT093000
            RRULE:FREQ=DAILY;COUNT=3;BYHOUR=9,10
            SUMMARY:%5$s
            END:VEVENT
            BEGIN:VEVENT
            UID:%1$s
            %2$s
            RECURRENCE-ID;TZID=%3$s:%6$sT090000
            DTSTART;TZID=%3$s:%6$sT091500
            DTEND;TZID=%3$s:%6$sT094500
            SUMMARY:%7$s
            END:VEVENT
            BEGIN:VEVENT
            UID:%1$s
            %2$s
            RECURRENCE-ID;TZID=%3$s:%6$sT100000
            DTSTART;TZID=%3$s:%6$sT101500
            DTEND;TZID=%3$s:%6$sT104500
            SUMMARY:%8$s
            END:VEVENT
            """.formatted(uid, STAMP, CUSTOM_ZONE, day0, title, day1, first, second)));

        String renamed = title("Second edited");
        String saved = renameAndAwait(calendar.openEvent(second).edit(THIS_EVENT), user, probe, renamed);

        List<String> overrides = Ics.overrides(saved);
        assertThat(overrides).hasSize(2);
        assertThat(overrides)
            .as("the first shift keeps its title")
            .anySatisfy(override -> {
                assertThat(Ics.property(override, "RECURRENCE-ID")).hasValue(day1 + "T090000");
                assertThat(Ics.property(override, "SUMMARY")).hasValue(first);
            });
        assertThat(overrides)
            .as("the edit lands on the second shift")
            .anySatisfy(override -> {
                assertThat(Ics.property(override, "RECURRENCE-ID")).hasValue(day1 + "T100000");
                assertThat(Ics.property(override, "SUMMARY")).hasValue(renamed);
            });
    }

    @Test
    @DisplayName("CUSTOM-ZONE-04 (#1993) An event whose VTIMEZONE the browser cannot expand opens and saves")
    void anUnexpandableVtimezoneStillOpens(Page page, E2EUser user, CalendarProbe probe) {
        String title = title("Unexpandable");
        // valid under RFC 5545, but ical.js refuses BYMONTH next to BYYEARDAY
        CalendarPage calendar = seed(page, user, probe, title, Vcal.calendar("""
            BEGIN:VTIMEZONE
            TZID:%s
            BEGIN:STANDARD
            DTSTART:19701025T030000
            RRULE:FREQ=YEARLY;BYMONTH=10;BYYEARDAY=298
            TZOFFSETFROM:+0200
            TZOFFSETTO:+0100
            END:STANDARD
            END:VTIMEZONE
            """.formatted(CUSTOM_ZONE), """
            BEGIN:VEVENT
            UID:%s
            %s
            DTSTART;TZID=%s:%sT100000
            DTEND;TZID=%s:%sT110000
            SUMMARY:%s
            END:VEVENT
            """.formatted(UUID.randomUUID(), STAMP, CUSTOM_ZONE, day0, CUSTOM_ZONE, day0, title)));

        // before the fix, reading the object threw: the form never opened
        String saved = renameAndAwait(calendar.openEvent(title).edit(), user, probe,
            title("Unexpandable renamed"));

        assertThat(Ics.property(Ics.event(saved), "DTSTART").orElseThrow()).startsWith(day0);
    }
}
