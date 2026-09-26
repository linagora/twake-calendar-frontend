package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.docker.E2EClock;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.linagora.calendar.e2e.pages.PrintDialog;
import com.microsoft.playwright.Page;

/**
 * The printable schedule.
 *
 * <p>Printing renders the schedule into a window of its own, so most of these assert on that
 * window rather than on the dialog: what matters is what a user would end up holding.
 */
class PrintScheduleTest extends TwakeCalendarE2ETest {
    private static final String OWN_CALENDAR = "My calendar";

    private static String unique(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    @Test
    @DisplayName("PRINT-01 The Print action opens the printable schedule dialog")
    void thePrintActionOpensTheDialog(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        PrintDialog print = calendar.printCalendar(OWN_CALENDAR);

        assertThat(print.isOpen()).isTrue();
        assertThat(print.text()).contains("Print schedule");
    }

    @Test
    @DisplayName("PRINT-02 The scale offers Day, Week and Month")
    void theScaleOffersTheThreeSpans(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        PrintDialog print = calendar.printCalendar(OWN_CALENDAR);

        assertThat(print.text()).contains("One page per").contains("Day").contains("Week")
            .contains("Month");
    }

    @Test
    @DisplayName("PRINT-03 The layout offers Grid and Schedule")
    void theLayoutOffersBothShapes(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        PrintDialog print = calendar.printCalendar(OWN_CALENDAR);

        assertThat(print.text()).contains("Layout").contains("Grid").contains("Schedule");
    }

    @Test
    @DisplayName("PRINT-04 This week fills the period with the week on screen")
    void thisWeekFillsThePeriod(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        java.util.List<String> visible = calendar.visibleDates();

        PrintDialog print = calendar.printCalendar(OWN_CALENDAR).thisWeek();

        LocalDate start = LocalDate.parse(visible.getFirst());
        assertThat(print.startDate())
            .as("the period has to start on the first day the grid was showing")
            .contains(String.valueOf(start.getDayOfMonth()))
            .contains(String.valueOf(start.getYear()));
        assertThat(print.endDate()).isNotEqualTo(print.startDate());
    }

    @Test
    @DisplayName("PRINT-05 An end date before the start is refused")
    void anEndDateBeforeTheStartIsRefused(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        PrintDialog print = calendar.printCalendar(OWN_CALENDAR)
            .startDate(E2EClock.today())
            .endDate(E2EClock.today().minusDays(3))
            .printExpectingRefusal();

        page.waitForTimeout(2500);
        assertThat(print.text())
            .as("a period that runs backwards has to be pointed out")
            .contains("The end date must be after the start date.");
    }

    @Test
    @DisplayName("PRINT-06 A range too wide to print is refused")
    void aRangeTooWideIsRefused(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        PrintDialog print = calendar.printCalendar(OWN_CALENDAR)
            .scale("Day")
            .startDate(E2EClock.today())
            .endDate(E2EClock.today().plusMonths(10))
            .printExpectingRefusal();

        page.waitForTimeout(2500);
        assertThat(print.text())
            .as("one page per day over ten months is not a printout, and has to be said")
            .contains("too large to print");
    }

    @Test
    @DisplayName("PRINT-07 Another calendar can be added to the printout")
    void anotherCalendarCanBeAdded(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String second = unique("Side calendar");
        calendar.addCalendar().name(second).create();
        calendar.showCalendar(second);

        PrintDialog print = calendar.printCalendar(OWN_CALENDAR).addCalendar(second);

        assertThat(print.text())
            .as("a calendar added to the printout has to show in the dialog")
            .contains(second);
    }

    @Test
    @DisplayName("PRINT-08 A period holding nothing prints as such")
    void aPeriodHoldingNothingPrintsAsSuch(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        PrintDialog print = calendar.printCalendar(OWN_CALENDAR)
            .layout("Schedule")
            .startDate(E2EClock.today().plusMonths(6))
            .endDate(E2EClock.today().plusMonths(6).plusDays(2));
        Page printed = print.print();

        assertThat(printed.locator("body").innerText())
            .as("an empty week has to say it is empty rather than print a blank page")
            .contains("No events");
    }

    @Test
    @DisplayName("PRINT-09 An event with no title is printed under a stand in")
    void anUntitledEventIsPrintedUnderAStandIn(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        calendar.selectTimeRange(E2EClock.today(), "10:00:00", "11:00:00").save();
        page.waitForTimeout(3000);

        PrintDialog print = calendar.printCalendar(OWN_CALENDAR).layout("Schedule").thisWeek();
        Page printed = print.print();

        assertThat(printed.locator("body").innerText())
            .as("an event nobody named still has to be printed, under something")
            .contains("(No title)");
    }

    @Test
    @DisplayName("PRINT-10 All day events are printed apart from the timed ones")
    void allDayEventsArePrintedApart(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = unique("Whole day affair");
        calendar.createEvent().title(title).expand().allDay().save();
        calendar.eventCard(title).first().waitFor();

        PrintDialog print = calendar.printCalendar(OWN_CALENDAR).layout("Schedule").thisWeek();
        Page printed = print.print();

        String printout = printed.locator("body").innerText();
        assertThat(printout).contains(title);
        assertThat(printout)
            .as("an all day event belongs under its own heading, not among the hours")
            .containsIgnoringCase("all day");
    }

    @Test
    @DisplayName("PRINT-11 A blocked window is explained rather than swallowed")
    void aBlockedWindowIsExplained(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        PrintDialog print = calendar.printCalendar(OWN_CALENDAR)
            .thisWeek()
            .withPopupsBlocked()
            .printExpectingRefusal();

        page.waitForTimeout(3000);
        assertThat(print.text())
            .as("a printout that never opened has to be explained, not silently dropped")
            .contains("Please allow pop-ups");
    }

    @Test
    @DisplayName("PRINT-12 A failure to load the events is explained")
    void aFailureToLoadTheEventsIsExplained(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        PrintDialog print = calendar.printCalendar(OWN_CALENDAR).thisWeek();

        page.route("**/*", route -> {
            if (route.request().url().contains("calendars")
                && !"GET".equals(route.request().method())) {
                route.fulfill(new com.microsoft.playwright.Route.FulfillOptions()
                    .setStatus(500).setBody(""));
            } else {
                route.resume();
            }
        });
        print.printExpectingRefusal();
        page.waitForTimeout(4000);

        assertThat(print.text())
            .as("a printout that could not gather its events has to say so")
            .contains("Could not load the calendar events");
        page.unrouteAll();
    }
}
