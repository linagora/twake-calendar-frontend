package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.deque.html.axecore.playwright.AxeBuilder;
import com.deque.html.axecore.results.Rule;
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
 * axe-core run against the screens an RGAA audit samples, so that an accessibility regression
 * fails the build instead of the next audit.
 *
 * <p>Only the WCAG 2.1 A / AA rules are checked, the scope of RGAA 4.1. The rules listed in
 * {@link #KNOWN_FAILURES} still fail on purpose: fixing them changes what the application looks
 * like and waits for design validation. Remove a rule from that list as soon as its fix lands;
 * see accessibility/A10Y_REMEDIATIONS-2026-10-01.md.
 */
class AxeScanTest extends TwakeCalendarE2ETest {

    private static final List<String> WCAG_21_AA = List.of("wcag2a", "wcag2aa", "wcag21a", "wcag21aa");

    /** Fails on every page; a visible change waiting for design validation. */
    private static final List<String> KNOWN_FAILURES = List.of(
        // R-08: the brand colours, secondary text and links do not reach 4.5:1
        "color-contrast");

    /** Known failures of the calendar view, see the A10Y audit. */
    private static final List<String> CALENDAR_KNOWN_FAILURES = List.of(
        // CAL-11: the timezone selector sits in FullCalendar's aria-hidden time axis
        "aria-hidden-focus",
        // CAL-16: sidebar accordions build aria-controls from translated titles, and nest
        // their "add" button inside the summary button
        "aria-valid-attr-value",
        "nested-interactive",
        // sidebar list items rendered outside of any list
        "listitem",
        // FullCalendar's scrolling grid is not keyboard focusable
        "scrollable-region-focusable");

    /** Known failures of the settings page, see the A10Y audit. */
    private static final List<String> SETTINGS_KNOWN_FAILURES = List.of(
        // the settings navigation list holds buttons instead of list items
        "list");

    private static String unique(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    /** One line per violated rule: its id, its impact and the first offending element. */
    private static List<String> violations(Page page, List<String> knownOnThisPage) {
        List<String> disabled = new java.util.ArrayList<>(KNOWN_FAILURES);
        disabled.addAll(knownOnThisPage);
        return new AxeBuilder(page)
            .withTags(WCAG_21_AA)
            .disableRules(disabled)
            .analyze()
            .getViolations()
            .stream()
            .map(AxeScanTest::describe)
            .toList();
    }

    private static String describe(Rule rule) {
        String firstTarget = rule.getNodes().isEmpty()
            ? ""
            : String.valueOf(rule.getNodes().get(0).getTarget());
        return rule.getId() + " (" + rule.getImpact() + ", " + rule.getNodes().size()
            + " elements) " + firstTarget;
    }

    @Test
    @DisplayName("AXE-01 The week view passes the automated WCAG 2.1 AA checks")
    void theWeekView(Page page, E2EUser user) {
        LoginPage.loginAs(page, user);

        assertThat(violations(page, CALENDAR_KNOWN_FAILURES)).isEmpty();
    }

    @Test
    @DisplayName("AXE-02 The expanded event form passes the automated WCAG 2.1 AA checks")
    void theEventForm(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        calendar.createEvent().title(unique("Scanned form")).expand();

        assertThat(violations(page, List.of())).isEmpty();
    }

    @Test
    @DisplayName("AXE-03 The event preview passes the automated WCAG 2.1 AA checks")
    void theEventPreview(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = unique("Scanned preview");
        calendar.createEvent().title(title).save();
        calendar.openEvent(title);

        assertThat(violations(page, List.of())).isEmpty();
    }

    @Test
    @DisplayName("AXE-04 The settings page passes the automated WCAG 2.1 AA checks")
    void theSettingsPage(Page page, E2EUser user) {
        LoginPage.loginAs(page, user).openSettings();

        assertThat(violations(page, SETTINGS_KNOWN_FAILURES)).isEmpty();
    }

    @Test
    @DisplayName("AXE-05 A public booking page with its time slots passes the automated WCAG 2.1 AA checks")
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
        PublicBookingPage.open(visitor, publicId).selectDay(day);

        assertThat(violations(visitor, List.of())).isEmpty();
    }

    @Test
    @DisplayName("AXE-06 The page of an unknown booking link passes the automated WCAG 2.1 AA checks")
    void anUnknownBookingLink(E2ESessions sessions) {
        Page visitor = sessions.blankPage();
        visitor.navigate(PublicBookingPage.BASE_URL + "/booking/" + UUID.randomUUID());
        visitor.getByRole(com.microsoft.playwright.options.AriaRole.HEADING,
            new Page.GetByRoleOptions().setLevel(1)).waitFor();

        assertThat(violations(visitor, List.of())).isEmpty();
    }
}
