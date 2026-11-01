package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.CalendarProbe;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.backend.Ical;
import com.linagora.calendar.e2e.backend.Vcal;
import com.linagora.calendar.e2e.docker.E2EClock;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.microsoft.playwright.Frame;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.WaitForSelectorState;

/** The printable schedule, fed with what real calendars hold: clock changes, broken dates. */
class PrintRobustnessTest extends TwakeCalendarE2ETest {
    private static final String OWN_CALENDAR = "My calendar";
    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");

    private static String title(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    private void awaitAttached(Locator locator) {
        locator.first().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.ATTACHED));
    }

    @Test
    @DisplayName("PRINT-ROBUST-01 (#1865) A late evening event after the clocks went back is printed")
    void aLateEventAfterTheClocksWentBackIsPrinted(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        // Paris left summer time on Sunday 25 October 2026; the event is the next evening
        LocalDate changeDay = LocalDate.of(2026, 10, 25);
        LocalDate dayAfter = changeDay.plusDays(1);
        String title = title("Late call");
        String uid = UUID.randomUUID().toString();
        ZonedDateTime start = dayAfter.atTime(23, 15).atZone(PARIS);
        probe.putEvent(user, uid, Ical.eventBetween(uid, title, start, start.plusMinutes(30)));

        Frame printed = calendar.printCalendar(OWN_CALENDAR)
            .scale("Day").layout("Schedule")
            .startDate(changeDay.minusDays(1)).endDate(dayAfter)
            .print();

        assertThat(printed.locator("body").innerText())
            .as("every page starts at local midnight, even past a clock change")
            .contains(title);
    }

    @Test
    @DisplayName("PRINT-ROBUST-02 (#1866) An all day event with an unreadable end does not stop the print")
    void anUnreadableEndDoesNotStopThePrint(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate today = E2EClock.today();
        String fine = title("Readable");
        String fineUid = UUID.randomUUID().toString();
        probe.putEvent(user, fineUid, Ical.event(fineUid, fine, today, 9));
        String broken = title("Unreadable");
        probe.putEvent(user, UUID.randomUUID().toString(), Vcal.calendar("""
            BEGIN:VEVENT
            UID:%s
            DTSTAMP:20260101T000000Z
            DTSTART;VALUE=DATE:%s
            DTEND;VALUE=TEXT:tomorrow
            SUMMARY:%s
            END:VEVENT
            """.formatted(UUID.randomUUID(), Vcal.day(today), broken)));
        calendar.reload();
        awaitAttached(calendar.eventCard(fine));

        Frame printed = calendar.printCalendar(OWN_CALENDAR).layout("Schedule").thisWeek().print();

        assertThat(printed.locator("body").innerText())
            .as("one event another client broke must not cost the user the whole printout")
            .contains(fine);
    }
}
