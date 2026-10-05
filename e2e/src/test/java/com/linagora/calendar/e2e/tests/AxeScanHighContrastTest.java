package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.docker.E2EClock;
import com.linagora.calendar.e2e.docker.E2ESessions;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.linagora.calendar.e2e.pages.PublicBookingPage;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.PlaywrightAssertions;

/**
 * The same axe-core scans as {@link AxeScanTest}, with the "High contrast mode" of the settings
 * turned on: there, colour contrast is checked too. The mode is a per device setting
 * (localStorage), set here before the application loads.
 */
class AxeScanHighContrastTest extends TwakeCalendarE2ETest {

    /** Known failures of the calendar view in high contrast mode, see the A10Y audit. */
    private static final List<String> CALENDAR_KNOWN_FAILURES = List.of(
        "aria-hidden-focus",
        "aria-valid-attr-value",
        "nested-interactive",
        "listitem",
        "scrollable-region-focusable",
        // R-19 (Tier 3): event chips and grid chrome keep their colours
        "color-contrast");

    private static String unique(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    static void enableHighContrast(Page page) {
        page.addInitScript("try { localStorage.setItem('highContrast', 'true') } catch (e) {}");
    }

    private static List<String> violations(Page page, List<String> knownOnThisPage) {
        return violationsIn(page, null, knownOnThisPage);
    }

    /**
     * Restricted to a dialog: the calendar grid behind it keeps its R-19 colours, and is
     * scanned by AXE-HC-01 already.
     */
    private static List<String> violationsIn(Page page, String scope,
                                             List<String> knownOnThisPage) {
        PlaywrightAssertions.assertThat(page.locator("html"))
            .hasAttribute("data-high-contrast", "true");
        return AxeScanTest.violations(page, scope, List.of(), knownOnThisPage);
    }

    @Test
    @DisplayName("AXE-HC-01 The week view passes the automated checks in high contrast mode")
    void theWeekView(Page page, E2EUser user) {
        enableHighContrast(page);
        LoginPage.loginAs(page, user);

        assertThat(violations(page, CALENDAR_KNOWN_FAILURES)).isEmpty();
    }

    @Test
    @DisplayName("AXE-HC-02 The expanded event form passes the automated checks in high contrast mode")
    void theEventForm(Page page, E2EUser user) {
        enableHighContrast(page);
        CalendarPage calendar = LoginPage.loginAs(page, user);
        calendar.createEvent().title(unique("Scanned form")).expand();

        assertThat(violationsIn(page, "[role=dialog]", List.of())).isEmpty();
    }

    @Test
    @DisplayName("AXE-HC-03 The event preview passes the automated checks in high contrast mode")
    void theEventPreview(Page page, E2EUser user) {
        enableHighContrast(page);
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = unique("Scanned preview");
        calendar.createEvent().title(title).save();
        calendar.openEvent(title);

        assertThat(violationsIn(page, "[role=dialog]", List.of())).isEmpty();
    }

    @Test
    @DisplayName("AXE-HC-04 The settings page passes the automated checks in high contrast mode")
    void theSettingsPage(Page page, E2EUser user) {
        enableHighContrast(page);
        LoginPage.loginAs(page, user).openSettings();

        assertThat(violations(page, AxeScanTest.SETTINGS_KNOWN_FAILURES)).isEmpty();
    }

    @Test
    @DisplayName("AXE-HC-05 A public booking page passes the automated checks in high contrast mode")
    void thePublicBookingPage(Page page, E2EUser user, E2ESessions sessions) {
        CalendarPage owner = LoginPage.loginAs(page, user);
        LocalDate day = E2EClock.daysAheadOnBothClocks(7);
        String name = unique("Scanned booking");
        owner.createBookingLink().name(name)
            .onlyAvailableOn(day.getDayOfWeek().name().substring(0, 3), "09:00", "12:00")
            .save();
        PlaywrightAssertions.assertThat(owner.bookingLinkChip(name).first()).isVisible();
        String publicId = owner.bookingLinkPublicId(name);

        Page visitor = sessions.blankPage();
        enableHighContrast(visitor);
        PublicBookingPage.open(visitor, publicId).selectDay(day);

        assertThat(violations(visitor, List.of())).isEmpty();
    }

    @Test
    @DisplayName("AXE-HC-06 The page of an unknown booking link passes the automated checks in high contrast mode")
    void anUnknownBookingLink(E2ESessions sessions) {
        Page visitor = sessions.blankPage();
        enableHighContrast(visitor);
        visitor.navigate(PublicBookingPage.BASE_URL + "/booking/" + UUID.randomUUID());
        visitor.getByRole(com.microsoft.playwright.options.AriaRole.HEADING,
            new Page.GetByRoleOptions().setLevel(1)).waitFor();

        assertThat(violations(visitor, List.of())).isEmpty();
    }
}
