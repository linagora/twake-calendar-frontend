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
        String brokenUid = UUID.randomUUID().toString();
        probe.putEvent(user, brokenUid, Ical.allDayEvent(brokenUid, title("Unreadable"), today, today));
        // The server now refuses to store a DTEND;VALUE=TEXT, which other clients wrote and
        // older objects still hold: the page puts it back into what the server answers. In the
        // page, not in a route: Playwright fetches a routed request outside the browser, where
        // the docker hostnames do not resolve.
        page.addInitScript("""
            (() => {
              const realFetch = window.fetch.bind(window);
              const readableEnd = /\\[\\s*"dtend"\\s*,\\s*\\{\\s*\\}\\s*,\\s*"date"\\s*,\\s*"%s"\\s*\\]/g;
              window.__e2eUnreadableEnds = 0;
              window.fetch = async (input, init) => {
                const response = await realFetch(input, init);
                const method = (init?.method ?? (input instanceof Request ? input.method : 'GET'));
                if (method.toUpperCase() !== 'REPORT') return response;
                const text = await response.clone().text();
                const broken = text.replace(readableEnd, () => {
                  window.__e2eUnreadableEnds++;
                  return '["dtend",{},"text","tomorrow"]';
                });
                if (broken === text) return response;
                const headers = new Headers(response.headers);
                headers.delete('content-length');
                headers.delete('content-encoding');
                return new Response(broken, { status: response.status, statusText: response.statusText, headers });
              };
            })();""".formatted(today.plusDays(1)));
        calendar.reload();
        awaitAttached(calendar.eventCard(fine));

        Frame printed = calendar.printCalendar(OWN_CALENDAR).layout("Schedule").thisWeek().print();

        assertThat(((Number) page.evaluate("window.__e2eUnreadableEnds")).intValue())
            .as("the events the print gathered held the unreadable end")
            .isPositive();
        assertThat(printed.locator("body").innerText())
            .as("one event another client broke must not cost the user the whole printout")
            .contains(fine);
    }

    @Test
    @DisplayName("PRINT-ROBUST-03 (#1982) An event started in the year 26 is printed on the days it covers")
    void aStartInATwoDigitYearIsNotReadAsThisCentury(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate today = E2EClock.today();
        // read as this century, its start falls after the printed days, and it is left out
        LocalDate typoDay = today.plusDays(5);
        String typoStart = "%04d%02d%02d".formatted(typoDay.getYear() % 100, typoDay.getMonthValue(),
            typoDay.getDayOfMonth());
        String title = title("Mistyped year");
        String uid = UUID.randomUUID().toString();
        probe.putEvent(user, uid, Vcal.calendar("""
            BEGIN:VEVENT
            UID:%s
            DTSTAMP:20260101T000000Z
            DTSTART:%sT100000Z
            DTEND:%sT100000Z
            SUMMARY:%s
            END:VEVENT
            """.formatted(uid, typoStart, Vcal.day(today.plusDays(10)), title)));

        Frame printed = calendar.printCalendar(OWN_CALENDAR)
            .scale("Day").layout("Schedule")
            .startDate(today).endDate(today.plusDays(2))
            .print();

        assertThat(printed.locator("body").innerText())
            .as("the event runs from long ago until after these days: dates compare as instants")
            .contains(title);
    }
}
