package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.docker.E2ESessions;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.microsoft.playwright.Page;

/**
 * The application on a small screen.
 *
 * <p>These assert on behaviour rather than on appearance -- which view opens, what is reachable,
 * whether anything overflows -- and stay away from pixel conformity, which belongs to other
 * tooling. A layout that merely looks different is not a failure here; one that cannot be used
 * is.
 *
 * <p>Each size gets a session of its own, because the application settles its layout as it
 * starts. Resizing an existing one is a different scenario, and the one `RESP-16` is about.
 */
class ResponsiveTest extends TwakeCalendarE2ETest {
    private static final int PHONE_WIDTH = 390;
    private static final int PHONE_HEIGHT = 844;
    private static final int TABLET_WIDTH = 900;
    private static final int TABLET_HEIGHT = 1200;

    private static String unique(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    /** Whether the page can be scrolled sideways, which on a phone is always a defect. */
    private boolean overflowsSideways(Page page) {
        return Boolean.TRUE.equals(page.evaluate("""
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1"""));
    }

    @Test
    @DisplayName("RESP-01 A phone opens on a single day rather than a whole week")
    void aPhoneOpensOnASingleDay(Page page, E2EUser user, E2ESessions sessions) {
        CalendarPage phone = sessions.openFor(user, PHONE_WIDTH, PHONE_HEIGHT);

        assertThat(phone.currentViewClass())
            .as("a week of columns is unreadable on a phone, the day view is the sensible default")
            .contains("Day");
    }

    @Test
    @DisplayName("RESP-13 Nothing overflows sideways on a narrow phone")
    void nothingOverflowsSidewaysOnANarrowPhone(Page page, E2EUser user, E2ESessions sessions) {
        CalendarPage phone = sessions.openFor(user, 320, 700);

        assertThat(overflowsSideways(phone.page()))
            .as("a page one has to drag sideways to read is broken, not merely cramped")
            .isFalse();
    }

    @Test
    @DisplayName("RESP-03 The sidebar is out of the way on a phone")
    void theSidebarIsOutOfTheWayOnAPhone(Page page, E2EUser user, E2ESessions sessions) {
        CalendarPage phone = sessions.openFor(user, PHONE_WIDTH, PHONE_HEIGHT);

        assertThat(phone.page().locator("li")
            .filter(new com.microsoft.playwright.Locator.FilterOptions().setHasText("My calendar"))
            .first().isVisible())
            .as("the calendar list cannot take a phone screen that the grid needs")
            .isFalse();
    }

    @Test
    @DisplayName("RESP-04 The sidebar can be called up and dismissed on a phone")
    void theSidebarCanBeCalledUpOnAPhone(Page page, E2EUser user, E2ESessions sessions) {
        CalendarPage phone = sessions.openFor(user, PHONE_WIDTH, PHONE_HEIGHT);
        Page phonePage = phone.page();

        phonePage.getByLabel("Toggle sidebar").click();
        phonePage.waitForTimeout(1500);

        assertThat(phonePage.locator("li")
            .filter(new com.microsoft.playwright.Locator.FilterOptions().setHasText("My calendar"))
            .first().isVisible())
            .as("hidden by default is fine, unreachable is not")
            .isTrue();
    }

    @Test
    @DisplayName("RESP-05 The creation form takes the whole phone screen")
    void theCreationFormTakesTheWholePhoneScreen(Page page, E2EUser user, E2ESessions sessions) {
        CalendarPage phone = sessions.openFor(user, PHONE_WIDTH, PHONE_HEIGHT);

        phone.selectTimeRange(java.time.LocalDate.now(), "10:00:00", "11:00:00")
            .title(unique("On a phone"));

        double width = phone.page().locator("[role=dialog]").last().boundingBox().width;
        assertThat(width)
            .as("a form squeezed into a corner of a phone cannot be filled in")
            .isGreaterThan(PHONE_WIDTH * 0.9);
    }

    @Test
    @DisplayName("RESP-10 Form fields are large enough not to make a phone zoom in")
    void formFieldsAreLargeEnoughNotToZoom(Page page, E2EUser user, E2ESessions sessions) {
        CalendarPage phone = sessions.openFor(user, PHONE_WIDTH, PHONE_HEIGHT);
        phone.selectTimeRange(java.time.LocalDate.now(), "10:00:00", "11:00:00")
            .title(unique("Zoom free"));

        @SuppressWarnings("unchecked")
        java.util.List<String> tooSmall = (java.util.List<String>) phone.page().evaluate("""
            () => Array.from(document.querySelectorAll('[role=dialog] input, [role=dialog] textarea'))
              .filter(field => field.offsetParent !== null)
              .filter(field => parseFloat(getComputedStyle(field).fontSize) < 16)
              .map(field => (field.getAttribute('aria-label') || field.getAttribute('placeholder')
                || field.name || 'unnamed')
                + ' at ' + getComputedStyle(field).fontSize)""");

        assertThat(tooSmall)
            .as("a field under 16px makes iOS zoom the page in the moment it is tapped")
            .isEmpty();
    }

    @Test
    @DisplayName("RESP-14 The mini calendar gives up its space on a phone")
    void theMiniCalendarGivesUpItsSpaceOnAPhone(Page page, E2EUser user, E2ESessions sessions) {
        CalendarPage phone = sessions.openFor(user, PHONE_WIDTH, PHONE_HEIGHT);

        assertThat(phone.page().getByLabel("Next month").count()
                + phone.page().getByLabel("Previous month").count())
            .as("a second calendar next to the first is a luxury a phone cannot afford")
            .isZero();
    }

    @Test
    @DisplayName("RESP-02 A tablet gets a menubar of its own, between the phone and the desktop")
    void aTabletGetsAMenubarOfItsOwn(Page page, E2EUser user, E2ESessions sessions) {
        CalendarPage tablet = sessions.openFor(user, TABLET_WIDTH, TABLET_HEIGHT);
        Page tabletPage = tablet.page();

        // a tablet keeps the sidebar toggle of the phone and regains what a phone has no room
        // for: the refresh and the profile
        assertThat(tabletPage.getByLabel("Toggle sidebar").count()).isPositive();
        assertThat(tabletPage.getByLabel("Refresh").count()).isPositive();
        assertThat(tabletPage.getByLabel("User profile").count()).isPositive();
        assertThat(overflowsSideways(tabletPage)).isFalse();
    }

    @Test
    @DisplayName("RESP-11 An event can be read on a phone without dragging the page sideways")
    void anEventCanBeReadOnAPhoneWithoutDragging(Page page, E2EUser user, E2ESessions sessions) {
        CalendarPage desktop = LoginPage.loginAs(page, user);
        String title = unique("Readable on a phone");
        // pinned to today: left to itself the form opens on the next round hour, which late in
        // the evening is tomorrow, and the phone would open its day view on an empty day
        java.time.LocalDate day = desktop.browserToday();
        desktop.createEvent().title(title).expand().at(day, "10:00", "11:00").save();
        desktop.eventCard(title).first().waitFor();
        CalendarPage phone = sessions.openFor(user, PHONE_WIDTH, PHONE_HEIGHT);
        phone.eventCard(title).first().waitFor(
            new com.microsoft.playwright.Locator.WaitForOptions().setTimeout(60_000));

        phone.openEvent(title);

        assertThat(overflowsSideways(phone.page()))
            .as("a preview wider than the screen hides half of what it says")
            .isFalse();
    }

    @Test
    @DisplayName("RESP-16 A window grown to desktop size stops behaving like a phone")
    void aWindowGrownToDesktopStopsBehavingLikeAPhone(Page page, E2EUser user,
                                                      E2ESessions sessions) {
        CalendarPage phone = sessions.openFor(user, PHONE_WIDTH, PHONE_HEIGHT);
        Page phonePage = phone.page();
        assertThat(phone.currentViewClass()).contains("Day");

        phonePage.setViewportSize(1500, 950);
        phonePage.waitForTimeout(3000);

        assertThat(phonePage.locator("li")
            .filter(new com.microsoft.playwright.Locator.FilterOptions().setHasText("My calendar"))
            .first().isVisible())
            .as("a window grown to a desktop has room for the sidebar again")
            .isTrue();
    }

    @Test
    @DisplayName("RESP-18 The recurrence form stays usable on a phone")
    void theRecurrenceFormStaysUsableOnAPhone(Page page, E2EUser user, E2ESessions sessions) {
        CalendarPage phone = sessions.openFor(user, PHONE_WIDTH, PHONE_HEIGHT);
        // the phone form is a compact one: the rest of the fields sit behind More options,
        // which is what the expand chevron is on a desktop
        var form = phone.selectTimeRange(java.time.LocalDate.now(), "10:00:00", "11:00:00")
            .title(unique("Repeating on a phone"));
        phone.page().getByRole(com.microsoft.playwright.options.AriaRole.BUTTON,
            new Page.GetByRoleOptions().setName("More options")).click();
        phone.page().getByLabel("Repeat", new Page.GetByLabelOptions().setExact(true)).waitFor();

        form.repeat().frequency(com.linagora.calendar.e2e.pages.RecurrenceSection.WEEKLY);

        assertThat(overflowsSideways(phone.page()))
            .as("the recurrence panel is the widest thing in the form, and still has to fit")
            .isFalse();
        assertThat(form.repeatToggle().isChecked()).isTrue();
    }
}
