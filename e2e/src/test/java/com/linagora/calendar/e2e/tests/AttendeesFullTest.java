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
import com.linagora.calendar.e2e.backend.E2EUserFactory;
import com.linagora.calendar.e2e.backend.Ics;
import com.linagora.calendar.e2e.docker.E2ESessions;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.LocatorAssertions;
import com.microsoft.playwright.assertions.PlaywrightAssertions;
import com.microsoft.playwright.options.WaitForSelectorState;

/** Inviting people, and what they can answer. */
class AttendeesFullTest extends TwakeCalendarE2ETest {

    private static String title(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    private void awaitAttached(Locator locator) {
        locator.first().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.ATTACHED));
    }

    private static String attendeeLine(String ical, String email) {
        return java.util.Arrays.stream(Ics.unfold(ical).split("\r?\n"))
            .filter(line -> line.startsWith("ATTENDEE") && line.contains(email))
            .findFirst()
            .orElseThrow(() -> new AssertionError(email + " is not an attendee of:\n" + ical));
    }

    @Test
    @DisplayName("ATT-01 Typing a valid email in the guest field adds it to the list")
    void typingAnEmailAddsAGuest(Page page, E2EUser user, E2EUserFactory users) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        E2EUser guest = users.newUser();

        var form = calendar.createEvent().title(title("Invitation")).addGuest(guest.email());

        assertThat(form.text()).contains(guest.email());
    }

    @Test
    @DisplayName("ATT-02 An invalid address is reported and not added")
    void anInvalidAddressIsReported(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        var form = calendar.createEvent().title(title("Bad guest"));
        form.typeGuest("not-an-email");
        page.keyboard().press("Enter");
        page.waitForTimeout(1000);

        assertThat(form.text()).contains("not-an-email is not a valid email address");
    }

    @Test
    @DisplayName("ATT-03 The directory search suggests the users of the domain")
    void theDirectorySuggestsDomainUsers(Page page, E2EUser user, E2EUserFactory users) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        E2EUser guest = users.newUser();

        var form = calendar.createEvent().title(title("Directory"));
        form.typeGuest(guest.email());
        page.waitForTimeout(3000);

        assertThat(page.locator("li[role=option]").allInnerTexts())
            .as("the domain directory should offer the account")
            .anySatisfy(option -> assertThat(option).contains(guest.email()));
    }

    @Test
    @DisplayName("ATT-04 Picking a suggestion adds the guest with their display name")
    void pickingASuggestionAddsTheGuest(Page page, E2EUser user, E2EUserFactory users) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        E2EUser guest = users.newUser("suggested");

        var form = calendar.createEvent().title(title("Picked"));
        form.typeGuest(guest.email());
        page.locator("li[role=option]").first().waitFor();
        page.locator("li[role=option]").first().click();
        page.waitForTimeout(800);

        assertThat(form.text()).contains(guest.email());
    }

    @Test
    @DisplayName("ATT-05 Removing a guest before saving takes them off the list")
    void removingAGuestBeforeSaving(Page page, E2EUser user, E2EUserFactory users, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        E2EUser guest = users.newUser();
        String title = title("Uninvited");

        var form = calendar.createEvent().title(title).addGuest(guest.email());
        form.removeGuest(guest.email());
        assertThat(form.text()).doesNotContain(guest.email());
        form.save();
        awaitAttached(calendar.eventCard(title));

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(probe.singleEvent(user)).doesNotContain(guest.email()));
    }

    @Test
    @DisplayName("ATT-06 The organizer is part of the guests and cannot be removed")
    void theOrganizerCannotBeRemoved(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Alone");

        calendar.createEvent(title);

        String ical = probe.singleEvent(user);
        assertThat(attendeeLine(ical, user.email()))
            .as("the organizer attends their own event")
            .contains("ROLE=CHAIR");
        assertThat(calendar.openEvent(title).text()).contains("1 participant")
            .doesNotContain("1 participants");
    }

    @Test
    @DisplayName("ATT-08 The preview shows the guest count and the breakdown of answers")
    void thePreviewShowsTheAnswerBreakdown(Page page, E2EUser user, E2EUserFactory users) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        E2EUser guest = users.newUser();
        String title = title("Breakdown");

        calendar.createEvent().title(title).addGuest(guest.email()).save();
        awaitAttached(calendar.eventCard(title));

        String preview = calendar.openEvent(title).text();
        assertThat(preview).contains("2 participants");
        assertThat(preview)
            .as("the organizer accepted, the guest has not answered yet")
            .contains("1 yes");
    }

    @Test
    @DisplayName("ATT-10 A guest can accept the invitation from the preview")
    void aGuestCanAccept(Page page, E2EUser organizer, E2EUserFactory users,
                         E2ESessions sessions, CalendarProbe probe) {
        E2EUser guest = users.newUser();
        CalendarPage guestCalendar = sessions.openFor(guest);
        CalendarPage calendar = LoginPage.loginAs(page, organizer);
        String title = title("To accept");
        calendar.createEvent().title(title).addGuest(guest.email()).save();
        awaitAttached(calendar.eventCard(title));

        guestCalendar.page().reload();
        guestCalendar.waitUntilLoaded();
        awaitAttached(guestCalendar.eventCard(title));
        guestCalendar.openEvent(title).answer("Yes");

        Awaitility.await().atMost(Duration.ofSeconds(45)).untilAsserted(() ->
            assertThat(attendeeLine(probe.singleEvent(guest), guest.email()))
                .contains("PARTSTAT=ACCEPTED"));
    }

    @Test
    @DisplayName("ATT-11 A guest can decline the invitation from the preview")
    void aGuestCanDecline(Page page, E2EUser organizer, E2EUserFactory users,
                          E2ESessions sessions, CalendarProbe probe) {
        E2EUser guest = users.newUser();
        CalendarPage guestCalendar = sessions.openFor(guest);
        CalendarPage calendar = LoginPage.loginAs(page, organizer);
        String title = title("To decline");
        calendar.createEvent().title(title).addGuest(guest.email()).save();
        awaitAttached(calendar.eventCard(title));

        guestCalendar.page().reload();
        guestCalendar.waitUntilLoaded();
        awaitAttached(guestCalendar.eventCard(title));
        guestCalendar.openEvent(title).answer("No");

        Awaitility.await().atMost(Duration.ofSeconds(45)).untilAsserted(() ->
            assertThat(attendeeLine(probe.singleEvent(guest), guest.email()))
                .contains("PARTSTAT=DECLINED"));
    }

    @Test
    @DisplayName("ATT-12 A guest can answer Maybe")
    void aGuestCanAnswerMaybe(Page page, E2EUser organizer, E2EUserFactory users,
                              E2ESessions sessions, CalendarProbe probe) {
        E2EUser guest = users.newUser();
        CalendarPage guestCalendar = sessions.openFor(guest);
        CalendarPage calendar = LoginPage.loginAs(page, organizer);
        String title = title("Maybe");
        calendar.createEvent().title(title).addGuest(guest.email()).save();
        awaitAttached(calendar.eventCard(title));

        guestCalendar.page().reload();
        guestCalendar.waitUntilLoaded();
        awaitAttached(guestCalendar.eventCard(title));
        guestCalendar.openEvent(title).answer("Maybe");

        Awaitility.await().atMost(Duration.ofSeconds(45)).untilAsserted(() ->
            assertThat(attendeeLine(probe.singleEvent(guest), guest.email()))
                .contains("PARTSTAT=TENTATIVE"));
    }

    @Test
    @DisplayName("ATT-13 A guest's answer reaches the organizer")
    void theAnswerReachesTheOrganizer(Page page, E2EUser organizer, E2EUserFactory users,
                                      E2ESessions sessions, CalendarProbe probe) {
        E2EUser guest = users.newUser();
        CalendarPage guestCalendar = sessions.openFor(guest);
        CalendarPage calendar = LoginPage.loginAs(page, organizer);
        String title = title("Round trip");
        calendar.createEvent().title(title).addGuest(guest.email()).save();
        awaitAttached(calendar.eventCard(title));

        guestCalendar.page().reload();
        guestCalendar.waitUntilLoaded();
        awaitAttached(guestCalendar.eventCard(title));
        guestCalendar.openEvent(title).answer("Yes");

        Awaitility.await().atMost(Duration.ofSeconds(60)).untilAsserted(() ->
            assertThat(attendeeLine(probe.singleEvent(organizer), guest.email()))
                .as("the organizer must learn the answer without asking")
                .contains("PARTSTAT=ACCEPTED"));
    }

    @Test
    @DisplayName("ATT-14 A guest who declined is shown as Declined")
    void aDeclinedGuestIsShownAsDeclined(Page page, E2EUser organizer, E2EUserFactory users,
                                         E2ESessions sessions, CalendarProbe probe) {
        E2EUser guest = users.newUser();
        CalendarPage guestCalendar = sessions.openFor(guest);
        CalendarPage calendar = LoginPage.loginAs(page, organizer);
        String title = title("Refused");
        calendar.createEvent().title(title).addGuest(guest.email()).save();
        awaitAttached(calendar.eventCard(title));

        guestCalendar.page().reload();
        guestCalendar.waitUntilLoaded();
        awaitAttached(guestCalendar.eventCard(title));
        guestCalendar.openEvent(title).answer("No");
        Awaitility.await().atMost(Duration.ofSeconds(60)).untilAsserted(() ->
            assertThat(attendeeLine(probe.singleEvent(organizer), guest.email()))
                .contains("PARTSTAT=DECLINED"));

        page.reload();
        calendar.waitUntilLoaded();
        assertThat(calendar.openEvent(title).showMore().text()).contains("1 no");
    }

    @Test
    @DisplayName("ATT-15 Adding a guest to an existing event sends them the invitation")
    void addingAGuestToAnExistingEvent(Page page, E2EUser organizer, E2EUserFactory users,
                                       E2ESessions sessions) {
        E2EUser guest = users.newUser();
        CalendarPage guestCalendar = sessions.openFor(guest);
        CalendarPage calendar = LoginPage.loginAs(page, organizer);
        String title = title("Late invite");
        calendar.createEvent(title);

        var form = calendar.openEvent(title).edit();
        form.addGuest(guest.email());
        form.save();

        guestCalendar.page().reload();
        guestCalendar.waitUntilLoaded();
        PlaywrightAssertions.assertThat(guestCalendar.eventCard(title).first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(60_000));
    }

    @Test
    @DisplayName("ATT-17 The same guest cannot be added twice")
    void theSameGuestCannotBeAddedTwice(Page page, E2EUser user, E2EUserFactory users,
                                        CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        E2EUser guest = users.newUser();
        String title = title("Once only");

        var form = calendar.createEvent().title(title).addGuest(guest.email());
        form.typeGuest(guest.email());
        page.keyboard().press("Enter");
        page.waitForTimeout(800);
        form.save();
        awaitAttached(calendar.eventCard(title));

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() -> {
            long occurrences = java.util.Arrays.stream(Ics.unfold(probe.singleEvent(user)).split("\r?\n"))
                .filter(line -> line.startsWith("ATTENDEE") && line.contains(guest.email()))
                .count();
            assertThat(occurrences).as("one guest, one ATTENDEE line").isEqualTo(1);
        });
    }

    @Test
    @DisplayName("ATT-18 Show more expands the full guest list beyond the fold")
    void showMoreExpandsTheGuestList(Page page, E2EUser user, E2EUserFactory users) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        E2EUser first = users.newUser();
        E2EUser second = users.newUser();
        String title = title("Crowd");
        calendar.createEvent().title(title)
            .addGuest(first.email())
            .addGuest(second.email())
            .save();
        awaitAttached(calendar.eventCard(title));

        var preview = calendar.openEvent(title);
        String folded = preview.text();
        String expanded = preview.showMore().text();

        assertThat(expanded.length())
            .as("the fold must actually hide something")
            .isGreaterThanOrEqualTo(folded.length());
        assertThat(expanded).contains(first.email()).contains(second.email());
    }
}
