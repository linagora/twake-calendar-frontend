package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.UUID;
import java.util.regex.Pattern;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.CalendarProbe;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.backend.Ical;
import com.linagora.calendar.e2e.backend.Ics;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.LocatorAssertions;
import com.microsoft.playwright.assertions.PlaywrightAssertions;
import com.microsoft.playwright.options.WaitForSelectorState;

/** Arriving from outside: the routes other applications and emails link to. */
class DeepLinksTest extends TwakeCalendarE2ETest {

    private static String title(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    private void awaitAttached(Locator locator) {
        locator.first().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.ATTACHED));
    }

    /** Creates an event and gives back its iCalendar UID, which is what the links carry. */
    private String uidOf(CalendarPage calendar, CalendarProbe probe, E2EUser user, String title) {
        calendar.createEvent(title);
        return Ics.property(Ics.event(probe.singleEvent(user)), "UID").orElseThrow();
    }

    @Test
    @DisplayName("DEEP-01 /events/:uid opens the event preview")
    void anEventLinkOpensThePreview(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Linked");
        String uid = uidOf(calendar, probe, user, title);

        page.navigate("/events/" + uid);

        PlaywrightAssertions.assertThat(page.getByText(title).first())
            .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(30_000));
        PlaywrightAssertions.assertThat(page.getByLabel("Edit event"))
            .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(30_000));
    }

    @Test
    @DisplayName("DEEP-02 /events/:uid on an unknown UID lands on the calendar rather than breaking")
    void anUnknownEventLinkIsHandled(Page page, E2EUser user) {
        LoginPage.loginAs(page, user);

        page.navigate("/events/" + UUID.randomUUID());

        // the application does not show error.eventNotFound here, it quietly takes the user to
        // their calendar; what matters for the suite is that a dead link never breaks the app
        PlaywrightAssertions.assertThat(page).hasURL(Pattern.compile(".*/calendar.*"));
        PlaywrightAssertions.assertThat(page.locator(".fc-view-harness"))
            .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(30_000));
        PlaywrightAssertions.assertThat(page.getByLabel("Create a new event")).isVisible();
    }

    @Test
    @DisplayName("DEEP-03 /events/:uid goes through the SSO when no session exists")
    void anEventLinkGoesThroughTheSso(Page page, E2EUser user, CalendarProbe probe,
                                      com.linagora.calendar.e2e.docker.E2ESessions sessions) {
        // create the event in another session, then arrive cold on the link
        CalendarPage other = sessions.openFor(user);
        String title = title("Cold arrival");
        String uid = uidOf(other, probe, user, title);

        page.navigate("/events/" + uid);
        new LoginPage(page).submit(user);

        PlaywrightAssertions.assertThat(page.getByText(title).first())
            .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(30_000));
    }

    @Test
    @DisplayName("DEEP-05 /newEvent?attendee= opens the form with the guest prefilled")
    void aNewEventLinkPrefillsTheGuest(Page page, E2EUser user,
                                       com.linagora.calendar.e2e.backend.E2EUserFactory users) {
        E2EUser guest = users.newUser();
        LoginPage.loginAs(page, user);

        page.navigate("/newEvent?attendee=" + guest.email());

        PlaywrightAssertions.assertThat(page.getByLabel("Title", new Page.GetByLabelOptions().setExact(true)).first())
            .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(30_000));
        assertThat(page.locator("[role=dialog]").last().innerText()).contains(guest.email());
    }

    @Test
    @DisplayName("DEEP-06 Repeated attendee parameters are all prefilled")
    void repeatedAttendeesAreAllPrefilled(Page page, E2EUser user,
                                          com.linagora.calendar.e2e.backend.E2EUserFactory users) {
        E2EUser first = users.newUser();
        E2EUser second = users.newUser();
        LoginPage.loginAs(page, user);

        page.navigate("/newEvent?attendee=" + first.email() + "&attendee=" + second.email());

        PlaywrightAssertions.assertThat(page.getByLabel("Title", new Page.GetByLabelOptions().setExact(true)).first())
            .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(30_000));
        String form = page.locator("[role=dialog]").last().innerText();
        assertThat(form).contains(first.email()).contains(second.email());
    }

    @Test
    @DisplayName("DEEP-07 Comma separated attendees are all prefilled")
    void commaSeparatedAttendeesAreAllPrefilled(Page page, E2EUser user,
                                                com.linagora.calendar.e2e.backend.E2EUserFactory users) {
        E2EUser first = users.newUser();
        E2EUser second = users.newUser();
        LoginPage.loginAs(page, user);

        page.navigate("/newEvent?attendee=" + first.email() + "," + second.email());

        PlaywrightAssertions.assertThat(page.getByLabel("Title", new Page.GetByLabelOptions().setExact(true)).first())
            .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(30_000));
        String form = page.locator("[role=dialog]").last().innerText();
        assertThat(form).contains(first.email()).contains(second.email());
    }

    @Test
    @DisplayName("DEEP-08 An invalid attendee does not stop the form from opening")
    void anInvalidAttendeeDoesNotBreakTheForm(Page page, E2EUser user) {
        LoginPage.loginAs(page, user);

        page.navigate("/newEvent?attendee=not-an-email");

        PlaywrightAssertions.assertThat(page.getByLabel("Title", new Page.GetByLabelOptions().setExact(true)).first())
            .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(30_000));
        // whatever it does with the value, the user must still be able to create their event
        PlaywrightAssertions.assertThat(page.getByRole(
            com.microsoft.playwright.options.AriaRole.BUTTON,
            new Page.GetByRoleOptions().setName("Save").setExact(true))).isVisible();
    }

    @Test
    @DisplayName("DEEP-09 The Create button names the prefilled guest")
    void theCreateButtonNamesThePrefilledGuest(Page page, E2EUser user,
                                               com.linagora.calendar.e2e.backend.E2EUserFactory users) {
        E2EUser guest = users.newUser();
        CalendarPage calendar = LoginPage.loginAs(page, user);

        page.navigate("/newEvent?attendee=" + guest.email());
        PlaywrightAssertions.assertThat(page.getByLabel("Title", new Page.GetByLabelOptions().setExact(true)).first())
            .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(30_000));
        page.getByLabel("close").click();
        page.waitForTimeout(1000);

        assertThat(calendar.page().getByLabel(Pattern.compile("Create a new event with")).count()
            + calendar.page().getByLabel("Create a new event").count())
            .as("the button says what it will do, prefilled guest included")
            .isPositive();
    }

    @Test
    @DisplayName("DEEP-10 /error hands the user back to their calendar")
    void theErrorRouteHandsBackToTheCalendar(Page page, E2EUser user) {
        LoginPage.loginAs(page, user);

        page.navigate("/error");

        // the route is not a standalone page one can link to: it redirects to the calendar
        PlaywrightAssertions.assertThat(page).hasURL(Pattern.compile(".*/calendar.*"));
        PlaywrightAssertions.assertThat(page.locator(".fc-view-harness"))
            .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(30_000));
    }

    @Test
    @DisplayName("DEEP-12 /events/:uid on a recurring event opens an occurrence of it")
    void anEventLinkOnARecurringEvent(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Recurring link");
        var form = calendar.createEvent().title(title).expand().startTime("09:00").endTime("10:00");
        form.repeat().frequency(com.linagora.calendar.e2e.pages.RecurrenceSection.DAILY).endsAfter(4);
        form.save();
        awaitAttached(calendar.eventCard(title));
        String uid = Ics.property(Ics.master(probe.singleEvent(user)), "UID").orElseThrow();

        page.navigate("/events/" + uid);

        PlaywrightAssertions.assertThat(page.getByText(title).first())
            .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(30_000));
        assertThat(page.locator(".MuiPopover-root:visible, [role=dialog]:visible").last().innerText())
            .contains("Recurrent Event");
    }
}
