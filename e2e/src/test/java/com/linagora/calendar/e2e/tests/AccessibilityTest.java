package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.EventFormModal;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.microsoft.playwright.Page;

/**
 * What the application offers to somebody who is not using a mouse, or not using their eyes.
 *
 * <p>These assert on the accessibility tree and on real keyboard interaction rather than on
 * appearance: a control without a name is unusable with a screen reader however good it looks,
 * and a modal that does not hold the focus sends a keyboard user behind it.
 */
class AccessibilityTest extends TwakeCalendarE2ETest {

    private static String unique(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    /** The accessible name of whatever currently has the focus. */
    private String focused(Page page) {
        return String.valueOf(page.evaluate("""
            () => {
              const el = document.activeElement;
              if (!el) return '';
              return (el.getAttribute('aria-label') || el.getAttribute('placeholder')
                || el.getAttribute('name') || el.tagName + ':' + (el.innerText || '').slice(0, 20));
            }"""));
    }

    @Test
    @DisplayName("A11Y-01 Every button of the menubar can be named out loud")
    void everyMenubarButtonCanBeNamed(Page page, E2EUser user) {
        LoginPage.loginAs(page, user);

        @SuppressWarnings("unchecked")
        List<String> nameless = (List<String>) page.evaluate("""
            () => Array.from(document.querySelectorAll('header button, [role=toolbar] button'))
              .filter(button => !(button.getAttribute('aria-label') || '').trim()
                && !(button.textContent || '').trim()
                && !(button.getAttribute('title') || '').trim())
              .map(button => button.outerHTML.slice(0, 80))""");

        assertThat(nameless)
            .as("a button nobody can name is a button nobody can use without seeing it")
            .isEmpty();
    }

    @Test
    @DisplayName("A11Y-02 The creation form keeps the focus inside itself")
    void theCreationFormKeepsTheFocusInside(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        calendar.createEvent().title(unique("Trapped"));

        for (int step = 0; step < 25; step++) {
            page.keyboard().press("Tab");
        }

        assertThat(page.evaluate("""
            () => {
              const dialog = document.querySelector('[role=dialog]');
              return dialog ? dialog.contains(document.activeElement) : false;
            }"""))
            .as("tabbing must not walk out of a modal and leave the user behind it")
            .isEqualTo(true);
    }

    @Test
    @DisplayName("A11Y-04 Tab moves from one field of the form to the next")
    void tabMovesFromOneFieldToTheNext(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        EventFormModal form = calendar.createEvent().title(unique("Walkable"));
        page.getByLabel("Title").first().focus();
        String first = focused(page);

        page.keyboard().press("Tab");

        assertThat(focused(page))
            .as("the focus has to move on, not stay put")
            .isNotEqualTo(first);
        form.close();
    }

    @Test
    @DisplayName("A11Y-07 Every field of the form is labelled")
    void everyFieldOfTheFormIsLabelled(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        calendar.createEvent().title(unique("Labelled")).expand();

        @SuppressWarnings("unchecked")
        List<String> unlabelled = (List<String>) page.evaluate("""
            () => Array.from(document.querySelectorAll('[role=dialog] input, [role=dialog] textarea'))
              // the shadow inputs MUI keeps beside its own controls are not fields a user meets
              .filter(field => field.type !== 'hidden' && field.offsetParent !== null)
              .filter(field => field.getAttribute('aria-hidden') !== 'true' && !field.readOnly)
              // a placeholder is no label (RGAA 11.1): it vanishes as soon as one types
              .filter(field => !(field.getAttribute('aria-label') || '').trim()
                && !(field.getAttribute('aria-labelledby') || '').split(' ')
                  .some(id => id && document.getElementById(id))
                && !(field.id && document.querySelector(`label[for="${field.id}"]`))
                && !field.closest('label'))
              .map(field => field.outerHTML.slice(0, 100))""");

        assertThat(unlabelled)
            .as("a field nobody can name cannot be filled without seeing it")
            .isEmpty();
    }

    @Test
    @DisplayName("A11Y-09 A calendar can be shown and hidden from the keyboard")
    void aCalendarCanBeToggledFromTheKeyboard(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        var checkbox = calendar.calendarCheckbox("My calendar");
        boolean before = checkbox.isChecked();

        checkbox.focus();
        page.keyboard().press("Space");
        page.waitForTimeout(800);

        assertThat(checkbox.isChecked())
            .as("a checkbox that only answers the mouse is not a checkbox")
            .isNotEqualTo(before);
    }

    @Test
    @DisplayName("A11Y-08 A dropdown opens and picks from the keyboard")
    void aDropdownOpensAndPicksFromTheKeyboard(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String before = calendar.currentViewClass();

        page.getByLabel("Select view").focus();
        page.keyboard().press("Enter");
        page.locator("li[role=option]").first().waitFor();
        page.keyboard().press("ArrowDown");
        page.keyboard().press("Enter");
        page.waitForTimeout(2000);

        assertThat(calendar.currentViewClass())
            .as("the view really changed, from the keyboard alone")
            .isNotEqualTo(before);
    }

    @Test
    @DisplayName("A11Y-14 The document title says which view of the application is shown")
    void theDocumentTitleSaysWhichViewIsShown(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        assertThat(page.title())
            .as("a browser full of tabs needs each one to say what it holds")
            .endsWith("Twake Calendar")
            .contains("Week");

        calendar.openSettings();
        assertThat(page.title()).isEqualTo("Settings – Twake Calendar");
    }

    @Test
    @DisplayName("A11Y-11 A refused save is announced, not only coloured")
    void aRefusedSaveIsAnnounced(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        page.route("**/*", route -> {
            if (route.request().url().contains("calendars")
                && !"GET".equals(route.request().method())) {
                route.fulfill(new com.microsoft.playwright.Route.FulfillOptions()
                    .setStatus(500).setBody(""));
            } else {
                route.resume();
            }
        });
        calendar.createEvent().title(unique("Announced failure")).trySave();
        page.waitForTimeout(5000);

        assertThat(page.locator("[role=alert], [aria-live]").count())
            .as("something going wrong has to reach somebody who cannot see the colour red")
            .isPositive();
        page.unrouteAll();
    }

    @Test
    @DisplayName("A11Y-15 The high contrast mode is switched from the settings and kept on reload")
    void theHighContrastModeIsSwitchedFromTheSettings(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        assertThat(page.locator("html").getAttribute("data-high-contrast"))
            .as("off by default: the interface looks as designed")
            .isNull();

        calendar.openSettings();
        page.getByRole(com.microsoft.playwright.options.AriaRole.BUTTON,
            new Page.GetByRoleOptions().setName("Accessibility")).click();
        // the switch of the Accessibility section; the side bar has its own (R-29)
        page.locator(".settings-content").getByRole(com.microsoft.playwright.options.AriaRole.SWITCH,
            new com.microsoft.playwright.Locator.GetByRoleOptions().setName("High contrast mode")).click();

        com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat(page.locator("html"))
            .hasAttribute("data-high-contrast", "true");
        page.reload();
        com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat(page.locator("html"))
            .hasAttribute("data-high-contrast", "true");
        // back on the calendar, the side bar switch tells the mode is on
        com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat(
                page.locator(".sidebar").getByRole(com.microsoft.playwright.options.AriaRole.SWITCH,
                    new com.microsoft.playwright.Locator.GetByRoleOptions().setName("High contrast mode")))
            .isChecked();
    }
}
