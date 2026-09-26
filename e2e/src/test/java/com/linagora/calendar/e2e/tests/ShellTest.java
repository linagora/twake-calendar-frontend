package com.linagora.calendar.e2e.tests;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.CalendarProbe;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.backend.Ical;
import com.linagora.calendar.e2e.docker.BrowserLog;
import com.linagora.calendar.e2e.docker.E2EClock;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.LocatorAssertions;

/** The application shell: menubar, sidebar, mini calendar. */
class ShellTest extends TwakeCalendarE2ETest {

    private static final DateTimeFormatter MONTH_YEAR =
        DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH);

    @Test
    @DisplayName("SHELL-01 The menubar exposes Today, Previous, Next, Search, Refresh and the profile")
    void theMenubarExposesItsActions(Page page, E2EUser user) {
        LoginPage.loginAs(page, user);

        List.of("Today", "Previous", "Next", "Search for events or calendars", "Refresh",
                "User profile")
            .forEach(action -> assertThat(
                page.getByLabel(action, new Page.GetByLabelOptions().setExact(true))).isVisible());
    }

    @Test
    @DisplayName("SHELL-02 The Create button opens the event creation modal")
    void theCreateButtonOpensTheModal(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        calendar.createEvent();

        assertThat(page.getByLabel("Title").first()).isVisible();
        assertThat(page.getByPlaceholder("Add title")).isVisible();
    }

    @Test
    @DisplayName("SHELL-03 The sidebar shows the My calendars section expanded by default")
    void myCalendarsIsExpandedByDefault(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        assertThat(calendar.sidebarSection("My calendars")).isVisible();
        assertThat(calendar.calendarCheckbox("My calendar")).isVisible();
    }

    @Test
    @DisplayName("SHELL-04 The sidebar shows the Other calendars, Resources and Booking links sections")
    void theSidebarShowsItsSections(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        List.of("Other calendars", "Resources", "Booking links")
            .forEach(section -> assertThat(calendar.sidebarSection(section)).isVisible());
    }

    @Test
    @DisplayName("SHELL-05 The mini calendar shows the current month with today selected")
    void theMiniCalendarShowsTheCurrentMonth(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        org.assertj.core.api.Assertions.assertThat(calendar.miniCalendarMonth())
            .isEqualTo(E2EClock.today().format(MONTH_YEAR));
        assertThat(page.locator("button.MuiPickerDay-root.Mui-selected").first())
            .hasText(String.valueOf(E2EClock.today().getDayOfMonth()));
    }

    @Test
    @DisplayName("SHELL-06 Clicking a date in the mini calendar moves the main grid to that date")
    void clickingTheMiniCalendarMovesTheGrid(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate target = E2EClock.today().withDayOfMonth(1).plusDays(20);
        String before = calendar.periodTitle();

        calendar.miniCalendarDay(target.getDayOfMonth()).click();

        assertThat(calendar.dayColumn(target).first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(20_000));
        org.assertj.core.api.Assertions.assertThat(calendar.visibleDayHeaders()).isNotEmpty();
        org.assertj.core.api.Assertions.assertThat(before).isNotBlank();
    }

    @Test
    @DisplayName("SHELL-07 The mini calendar arrows change month without moving the main grid")
    void theMiniCalendarArrowsDoNotMoveTheGrid(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        List<String> gridBefore = calendar.visibleDayHeaders();

        calendar.miniCalendarNextMonth();

        org.assertj.core.api.Assertions.assertThat(calendar.miniCalendarMonth())
            .isEqualTo(E2EClock.today().plusMonths(1).format(MONTH_YEAR));
        org.assertj.core.api.Assertions.assertThat(calendar.visibleDayHeaders())
            .as("browsing the mini calendar is not navigating the agenda")
            .isEqualTo(gridBefore);
    }

    @Test
    @DisplayName("SHELL-08 Collapsing a sidebar section hides its content")
    void collapsingASidebarSectionHidesIt(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        assertThat(calendar.calendarCheckbox("My calendar")).isVisible();

        calendar.sidebarSection("My calendars").click();

        assertThat(calendar.calendarCheckbox("My calendar"))
            .not().isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(20_000));

        calendar.sidebarSection("My calendars").click();
        assertThat(calendar.calendarCheckbox("My calendar")).isVisible();
    }

    @Test
    @DisplayName("SHELL-09 The Refresh button reloads the events of the displayed range")
    void refreshReloadsTheDisplayedRange(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = "Refreshed " + UUID.randomUUID().toString().substring(0, 8);
        String uid = UUID.randomUUID().toString();
        probe.putEvent(user, uid, Ical.event(uid, title, E2EClock.today(), 9));
        probe.deleteEvent(user, uid);
        // put it back without the websocket noticing, so only a refresh can surface it
        probe.putEvent(user, uid, Ical.event(uid, title, E2EClock.today(), 9));

        calendar.refresh();

        assertThat(calendar.eventCard(title).first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(30_000));
    }

    @Test
    @DisplayName("SHELL-10 The page title is Twake Calendar")
    void thePageTitleIsTwakeCalendar(Page page, E2EUser user) {
        LoginPage.loginAs(page, user);

        assertThat(page).hasTitle("Twake Calendar");
    }

    @Test
    @DisplayName("SHELL-11 The application version is displayed in the settings")
    void theVersionIsDisplayedInTheSettings(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        calendar.openSettings();

        assertThat(page.getByText("version", new Page.GetByTextOptions().setExact(false)).first())
            .isVisible();
    }

    @Test
    @DisplayName("SHELL-12 No console error is emitted on the initial calendar load")
    void noConsoleErrorOnTheInitialLoad(Page page, E2EUser user, BrowserLog log) {
        LoginPage.loginAs(page, user);
        page.waitForTimeout(4000);

        org.assertj.core.api.Assertions.assertThat(log.pageErrors())
            .as("an uncaught exception leaves the interface in an unknown state")
            .isEmpty();
        org.assertj.core.api.Assertions.assertThat(log.consoleErrors())
            .as("the browser complained: %s", log.explain())
            .isEmpty();
    }

    @Test
    @DisplayName("SHELL-13 Collapsing a full screen event form gives the menubar its actions back")
    void collapsingAFullScreenFormRestoresTheMenubar(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = "Collapsed " + UUID.randomUUID().toString().substring(0, 8);
        calendar.createEvent(title);

        calendar.openEvent(title).edit().expand().collapse();

        assertTheMenubarNavigationIsVisible(page);
    }

    @Test
    @DisplayName("SHELL-14 Saving a full screen event edit gives the menubar its actions back")
    void savingAFullScreenEditRestoresTheMenubar(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = "Saved " + UUID.randomUUID().toString().substring(0, 8);
        calendar.createEvent(title);

        calendar.openEvent(title).edit().expand().title(title + " edited").save();

        assertTheMenubarNavigationIsVisible(page);
    }

    @Test
    @DisplayName("SHELL-15 Saving a full screen event creation gives the menubar its actions back")
    void savingAFullScreenCreationRestoresTheMenubar(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        calendar.createEvent().title("Created " + UUID.randomUUID().toString().substring(0, 8))
            .expand().save();

        assertTheMenubarNavigationIsVisible(page);
    }

    private static void assertTheMenubarNavigationIsVisible(Page page) {
        List.of("Today", "Previous", "Next", "Search for events or calendars", "Refresh")
            .forEach(action -> assertThat(
                page.getByLabel(action, new Page.GetByLabelOptions().setExact(true))).isVisible());
    }
}
