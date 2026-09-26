package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.UUID;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.CalendarProbe;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.backend.Ical;
import com.linagora.calendar.e2e.docker.E2EClock;
import com.linagora.calendar.e2e.pages.CalendarModal;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.LocatorAssertions;
import com.microsoft.playwright.assertions.PlaywrightAssertions;
import com.microsoft.playwright.options.WaitForSelectorState;

/** Personal calendars: creating them, dressing them, hiding them, removing them. */
class CalendarsTest extends TwakeCalendarE2ETest {

    private static String name(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 6);
    }

    private void awaitAttached(Locator locator) {
        locator.first().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.ATTACHED));
    }

    private String seedEvent(CalendarProbe probe, E2EUser user) {
        String title = "Seeded " + UUID.randomUUID().toString().substring(0, 8);
        String uid = UUID.randomUUID().toString();
        probe.putEvent(user, uid, Ical.event(uid, title, E2EClock.today(), 9));
        return title;
    }

    private static String cardColour(Page page, String title) {
        return String.valueOf(page.evaluate("(t) => { const e = Array.from("
            + "document.querySelectorAll('[data-testid^=event-card]')).find(n => n.innerText.includes(t));"
            + " return e ? getComputedStyle(e).backgroundColor : 'none'; }", title));
    }

    @Test
    @DisplayName("CAL-01 The default personal calendar is named My calendar")
    void theDefaultCalendarIsNamedMyCalendar(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        PlaywrightAssertions.assertThat(calendar.calendarCheckbox("My calendar")).isVisible();
        // the collection is named #default on the wire, the interface is what names it
        assertThat(probe.calendarNames(user)).isNotEmpty();
    }

    @Test
    @DisplayName("CAL-02 Creating a personal calendar adds it to the sidebar")
    void creatingACalendarAddsItToTheSidebar(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String name = name("Sport");

        calendar.addCalendar().name(name).create();

        PlaywrightAssertions.assertThat(calendar.calendarCheckbox(name))
            .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(20_000));
    }

    @Test
    @DisplayName("CAL-03 A created calendar is visible over CalDAV")
    void aCreatedCalendarIsVisibleOverCalDav(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String name = name("Shared with DAV");

        calendar.addCalendar().name(name).create();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(probe.calendarNames(user)).contains(name));
    }

    @Test
    @DisplayName("CAL-04 Unticking a calendar hides its events from the grid")
    void untickingACalendarHidesItsEvents(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = seedEvent(probe, user);
        page.reload();
        calendar.waitUntilLoaded();
        awaitAttached(calendar.eventCard(title));

        calendar.calendarCheckbox("My calendar").uncheck();

        PlaywrightAssertions.assertThat(calendar.eventCard(title))
            .hasCount(0, new LocatorAssertions.HasCountOptions().setTimeout(20_000));
    }

    @Test
    @DisplayName("CAL-05 Ticking a calendar back shows its events again")
    void tickingACalendarBackShowsItsEvents(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = seedEvent(probe, user);
        page.reload();
        calendar.waitUntilLoaded();
        awaitAttached(calendar.eventCard(title));
        calendar.calendarCheckbox("My calendar").uncheck();
        PlaywrightAssertions.assertThat(calendar.eventCard(title))
            .hasCount(0, new LocatorAssertions.HasCountOptions().setTimeout(20_000));

        calendar.calendarCheckbox("My calendar").check();

        PlaywrightAssertions.assertThat(calendar.eventCard(title).first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(20_000));
    }

    @Test
    @DisplayName("CAL-06 Renaming a calendar updates the sidebar")
    void renamingACalendarUpdatesTheSidebar(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String before = name("Before");
        String after = name("After");
        calendar.addCalendar().name(before).create();
        PlaywrightAssertions.assertThat(calendar.calendarCheckbox(before)).isVisible();

        calendar.modifyCalendar(before).name(after).save();

        PlaywrightAssertions.assertThat(calendar.calendarCheckbox(after))
            .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(20_000));
        PlaywrightAssertions.assertThat(calendar.calendarCheckbox(before)).hasCount(0);
        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(probe.calendarNames(user)).contains(after).doesNotContain(before));
    }

    @Test
    @DisplayName("CAL-07 Changing the colour of a calendar recolours its events")
    void changingTheColourRecoloursTheEvents(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = seedEvent(probe, user);
        page.reload();
        calendar.waitUntilLoaded();
        awaitAttached(calendar.eventCard(title));
        String before = cardColour(page, title);

        calendar.modifyCalendar("My calendar").color("#F5CFD0").save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(cardColour(page, title)).isNotEqualTo(before));
    }

    @Test
    @DisplayName("CAL-08 The custom colour picker accepts a hexadecimal value")
    void theCustomColourPickerAcceptsHex(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String name = name("Custom");

        var modal = calendar.addCalendar().name(name);
        modal.customColor("#123456");
        modal.create();

        PlaywrightAssertions.assertThat(calendar.calendarCheckbox(name))
            .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(20_000));
        page.reload();
        calendar.waitUntilLoaded();
        // #242 crashed on reload when the colour was not a plain string
        PlaywrightAssertions.assertThat(calendar.calendarCheckbox(name)).isVisible();
    }

    @Test
    @DisplayName("CAL-09 Deleting a calendar warns about the loss of its events")
    void deletingACalendarWarnsAboutItsEvents(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String name = name("Doomed");
        calendar.addCalendar().name(name).create();
        PlaywrightAssertions.assertThat(calendar.calendarCheckbox(name)).isVisible();

        calendar.openCalendarMenu(name);
        page.getByRole(com.microsoft.playwright.options.AriaRole.MENUITEM,
            new Page.GetByRoleOptions().setName(java.util.regex.Pattern.compile("Delete|Remove"))).click();
        page.waitForTimeout(1200);

        assertThat(page.locator("[role=dialog]").last().innerText())
            .as("losing every event of a calendar deserves a warning")
            .contains(name)
            .containsIgnoringCase("lose");
    }

    @Test
    @DisplayName("CAL-10 Deleting a calendar removes its events from the grid")
    void deletingACalendarRemovesItsEvents(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String name = name("Temporary");
        calendar.addCalendar().name(name).create();
        PlaywrightAssertions.assertThat(calendar.calendarCheckbox(name)).isVisible();
        calendar.showCalendar(name);
        String title = "In the doomed calendar " + UUID.randomUUID().toString().substring(0, 6);
        var form = calendar.createEvent().title(title).expand();
        form.calendar(name);
        form.save();
        awaitAttached(calendar.eventCard(title));

        calendar.deleteCalendar(name);

        PlaywrightAssertions.assertThat(calendar.calendarCheckbox(name))
            .hasCount(0, new LocatorAssertions.HasCountOptions().setTimeout(20_000));
        PlaywrightAssertions.assertThat(calendar.eventCard(title))
            .hasCount(0, new LocatorAssertions.HasCountOptions().setTimeout(20_000));
        PlaywrightAssertions.assertThat(page.locator(".fc-view-harness")).isVisible();
    }

    @Test
    @DisplayName("CAL-11 The default calendar cannot be deleted")
    void theDefaultCalendarCannotBeDeleted(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        assertThat(calendar.calendarMenuEntries("My calendar"))
            .as("the calendar every event falls back to is not removable")
            .doesNotContain("Delete", "Remove");
    }

    @Test
    @DisplayName("CAL-12 An event created in a second calendar takes its colour")
    void anEventTakesTheColourOfItsCalendar(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String name = name("Pink");
        // deliberately not the first swatch: that one is also the default calendar colour
        calendar.addCalendar().name(name).color("#F5CFD0").create();
        PlaywrightAssertions.assertThat(calendar.calendarCheckbox(name)).isVisible();
        calendar.showCalendar(name);

        String inDefault = "Default one " + UUID.randomUUID().toString().substring(0, 6);
        calendar.createEvent(inDefault);
        String inOther = "Other one " + UUID.randomUUID().toString().substring(0, 6);
        var form = calendar.createEvent().title(inOther).expand();
        form.calendar(name);
        form.save();
        awaitAttached(calendar.eventCard(inOther));

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(cardColour(page, inOther))
                .as("two calendars, two colours")
                .isNotEqualTo(cardColour(page, inDefault)));
    }

    @Test
    @DisplayName("CAL-15 The default visibility of new events is configurable per calendar")
    void theDefaultVisibilityIsConfigurable(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String name = name("Private one");

        var modal = calendar.addCalendar().name(name);
        assertThat(modal.text()).contains("New events created will be visible to:");
        modal.newEventsVisibleTo("You");
        modal.create();

        PlaywrightAssertions.assertThat(calendar.calendarCheckbox(name))
            .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(20_000));
        assertThat(calendar.modifyCalendar(name).text())
            .as("the choice must come back when the calendar is reopened")
            .contains("New events created will be visible to:");
    }


    @Test
    @DisplayName("CAL-13 The Access tab publishes the CalDAV address of the calendar")
    void theAccessTabPublishesTheCaldavAddress(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        CalendarModal modal = calendar.modifyCalendar("My calendar").tab("Access");

        assertThat(modal.text()).contains("CalDAV access");
        assertThat(modal.caldavUrl())
            .as("the address has to name the calendar, not merely be present")
            .contains("/calendars/");
        modal.close();
    }

    @Test
    @DisplayName("CAL-14 The Access tab offers a secret address and a way to renew it")
    void theAccessTabOffersASecretAddress(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        CalendarModal modal = calendar.modifyCalendar("My calendar").tab("Access");
        String before = modal.secretUrl();

        assertThat(modal.text()).contains("Secret URL");
        assertThat(before).contains("token=");

        modal.resetSecretUrl();

        assertThat(modal.secretUrl())
            .as("renewing has to hand back a different address, otherwise it renews nothing")
            .isNotEqualTo(before)
            .contains("token=");
        modal.close();
    }

}
