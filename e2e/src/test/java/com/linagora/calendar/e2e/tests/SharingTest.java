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
import com.linagora.calendar.e2e.backend.Ical;
import com.linagora.calendar.e2e.backend.Ics;
import com.linagora.calendar.e2e.docker.E2EClock;
import com.linagora.calendar.e2e.docker.E2ESessions;
import com.linagora.calendar.e2e.pages.CalendarModal;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.EventFormModal;
import com.linagora.calendar.e2e.pages.EventPreviewPopover;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.linagora.calendar.e2e.pages.RecurrenceSection;
import com.linagora.calendar.e2e.pages.SharedCalendar;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.LocatorAssertions;
import com.microsoft.playwright.assertions.PlaywrightAssertions;
import com.microsoft.playwright.options.WaitForSelectorState;

/**
 * Delegating a calendar to somebody else.
 *
 * <p>The owner works in the test's own browser, the grantee in a session of their own, so the
 * two views of the same calendar are never the same page: a right that only appears to work
 * because the owner is looking at it could not pass here.
 *
 * <p>The product offers three rights and no more: View all events, Editor and Administrator.
 */
class SharingTest extends TwakeCalendarE2ETest {
    private static final String OWN_CALENDAR = "My calendar";
    /** How long a share may take to reach the other session. */
    private static final long PROPAGATION_MS = SharedCalendar.PROPAGATION_MS;

    private static String uniqueTitle(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    /** The grantee's name for a calendar shared with them, as the sidebar spells it. */
    private static String sharedName(E2EUser owner) {
        return owner.email();
    }

    /** Grants a right and returns once the owner's dialog has saved it. */
    private void share(CalendarPage owner, E2EUser grantee, String right) {
        CalendarModal modal = owner.modifyCalendar(OWN_CALENDAR).tab("Access");
        modal.grantAccess(grantee.email(), right);
        modal.save();
    }

    /** The sidebar row of a calendar somebody shared, see {@link SharedCalendar#row()}. */
    private Locator sharedCalendarRow(Page page, E2EUser owner) {
        return new SharedCalendar(page, owner).row();
    }

    private void awaitSharedCalendar(Page grantee, E2EUser owner) {
        new SharedCalendar(grantee, owner).awaitInSidebar();
    }

    private java.util.List<String> menuOfSharedCalendar(Page page, E2EUser owner) {
        return new SharedCalendar(page, owner).menu();
    }

    /** Writes an event into the owner's calendar, today, and returns its title. */
    private String seedOwnerEvent(CalendarProbe probe, E2EUser owner, String prefix, int startHourUtc) {
        String title = uniqueTitle(prefix);
        String uid = UUID.randomUUID().toString();
        probe.putEvent(owner, uid, Ical.event(uid, title, E2EClock.today(), startHourUtc));
        return title;
    }

    @Test
    @DisplayName("SHARE-01 The Access tab grants a right to another user")
    void theAccessTabGrantsARight(Page page, E2EUser user, E2EUserFactory users,
                                  E2ESessions sessions) {
        E2EUser mate = users.newUser("mate");
        CalendarPage calendar = LoginPage.loginAs(page, user);

        CalendarModal modal = calendar.modifyCalendar(OWN_CALENDAR).tab("Access");
        modal.grantAccess(mate.email(), "View all events");

        assertThat(modal.hasAccessRow(mate.email())).isTrue();
        assertThat(modal.rightOf(mate.email())).isEqualTo("View all events");
        modal.save();
    }

    @Test
    @DisplayName("SHARE-02 The grantee finds the calendar in their own sidebar")
    void theGranteeFindsTheCalendarInTheirSidebar(Page page, E2EUser user, E2EUserFactory users,
                                                  E2ESessions sessions) {
        E2EUser mate = users.newUser("mate");
        Page matePage = sessions.pageFor(mate);
        CalendarPage calendar = LoginPage.loginAs(page, user);

        share(calendar, mate, "View all events");

        awaitSharedCalendar(matePage, user);
    }

    @Test
    @DisplayName("SHARE-04 An editing right allows creating in the shared calendar")
    void anEditingRightAllowsCreating(Page page, E2EUser user, E2EUserFactory users,
                                      E2ESessions sessions, CalendarProbe probe) {
        E2EUser mate = users.newUser("mate");
        Page matePage = sessions.pageFor(mate);
        CalendarPage calendar = LoginPage.loginAs(page, user);

        share(calendar, mate, "Editor");

        awaitSharedCalendar(matePage, user);
        CalendarPage mateCalendar = new CalendarPage(matePage);
        String title = uniqueTitle("Written by the delegate");
        mateCalendar.createEvent().title(title).expand()
            .calendar(user.uid())
            .save();

        Awaitility.await().atMost(Duration.ofMillis(PROPAGATION_MS)).untilAsserted(() ->
            assertThat(probe.eventSummaries(user))
                .as("what the delegate wrote belongs in the owner's calendar")
                .contains(title));
    }

    @Test
    @DisplayName("SHARE-06 Only the three documented rights can be granted")
    void onlyTheThreeDocumentedRightsCanBeGranted(Page page, E2EUser user, E2EUserFactory users,
                                                  E2ESessions sessions) {
        E2EUser mate = users.newUser("mate");
        CalendarPage calendar = LoginPage.loginAs(page, user);

        CalendarModal modal = calendar.modifyCalendar(OWN_CALENDAR).tab("Access");
        modal.grantAccess(mate.email(), "View all events");

        assertThat(modal.accessRightOptions(mate.email()))
            .containsExactly("View all events", "Editor", "Administrator");
    }

    @Test
    @DisplayName("SHARE-07 Revoking a right takes the calendar back")
    void revokingARightTakesTheCalendarBack(Page page, E2EUser user, E2EUserFactory users,
                                            E2ESessions sessions) {
        E2EUser mate = users.newUser("mate");
        Page matePage = sessions.pageFor(mate);
        CalendarPage calendar = LoginPage.loginAs(page, user);
        share(calendar, mate, "View all events");
        awaitSharedCalendar(matePage, user);

        CalendarModal modal = calendar.modifyCalendar(OWN_CALENDAR).tab("Access");
        modal.revokeAccess(mate.email());
        modal.save();

        Awaitility.await().atMost(Duration.ofMillis(PROPAGATION_MS))
            .pollInterval(Duration.ofSeconds(2))
            .untilAsserted(() -> {
                matePage.reload();
                new CalendarPage(matePage).waitUntilLoaded();
                matePage.waitForTimeout(2000);
                assertThat(sharedCalendarRow(matePage, user).count())
                    .as("a right taken back has to disappear from the other side too")
                    .isZero();
            });
    }

    @Test
    @DisplayName("SHARE-07 Revoking a right takes the owner's events off the grantee's grid")
    void revokingARightTakesTheEventsBack(Page page, E2EUser user, E2EUserFactory users,
                                          E2ESessions sessions, CalendarProbe probe) {
        E2EUser mate = users.newUser("mate");
        Page matePage = sessions.pageFor(mate);
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = seedOwnerEvent(probe, user, "Soon out of reach", 10);
        share(calendar, mate, "View all events");
        new SharedCalendar(matePage, user).awaitEvent(title);

        CalendarModal modal = calendar.modifyCalendar(OWN_CALENDAR).tab("Access");
        modal.revokeAccess(mate.email());
        modal.save();

        CalendarPage mateCalendar = new CalendarPage(matePage);
        Awaitility.await().atMost(Duration.ofMillis(PROPAGATION_MS))
            .pollInterval(Duration.ofSeconds(2))
            .untilAsserted(() -> {
                matePage.reload();
                mateCalendar.waitUntilLoaded();
                matePage.waitForTimeout(2000);
                assertThat(mateCalendar.eventCard(title).count())
                    .as("the events of a calendar taken back go with it, not only its sidebar row")
                    .isZero();
            });
    }

    @Test
    @DisplayName("SHARE-03 A read right on a private calendar shows the owner's events, "
        + "read through the grantee's own instance of it")
    void aReadRightOnAPrivateCalendarShowsTheOwnersEvents(Page page, E2EUser user,
                                                          E2EUserFactory users,
                                                          E2ESessions sessions,
                                                          CalendarProbe probe) {
        E2EUser mate = users.newUser("mate");
        Page matePage = sessions.pageFor(mate);
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = seedOwnerEvent(probe, user, "Owner only meeting", 10);
        share(calendar, mate, "View all events");
        // after the share: saving the Access tab writes the visibility too
        probe.setPublicRight(user, CalendarProbe.PublicRight.NONE);
        // free-busy stays public whatever the public right: it is the events that are not
        assertThat(probe.publicPrivileges(user))
            .as("the calendar under test lets the other users of the instance read no event")
            .doesNotContain("{DAV:}read", "{DAV:}write", "{DAV:}all");

        SharedCalendar shared = new SharedCalendar(matePage, user)
            .watchRequestsToOwnerNode(probe.requireOpenPaasId(user));
        shared.awaitEvent(title);
        EventPreviewPopover preview = new CalendarPage(matePage).openEvent(title);

        assertThat(preview.text())
            .as("the grantee reads the event itself, not only a slot in their grid")
            .contains(title);
        assertThat(shared.requestsToOwnerNode())
            .as("a share grants nothing on the owner's own node: every read has to go through "
                + "the grantee's instance of the calendar")
            .isEmpty();
    }

    @Test
    @DisplayName("SHARE-11 A private event of the owner shows to a reader without its details")
    void aPrivateEventShowsWithoutItsDetails(Page page, E2EUser user, E2EUserFactory users,
                                             E2ESessions sessions, CalendarProbe probe) {
        E2EUser mate = users.newUser("mate");
        Page matePage = sessions.pageFor(mate);
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String anchor = seedOwnerEvent(probe, user, "Public anchor", 7);
        String secret = uniqueTitle("Secret interview");
        String secretPlace = uniqueTitle("Room of secrets");
        String uid = UUID.randomUUID().toString();
        probe.putEvent(user, uid, Ical.privateEvent(uid, secret, secretPlace, E2EClock.today(), 13));
        share(calendar, mate, "View all events");
        probe.setPublicRight(user, CalendarProbe.PublicRight.NONE);

        new SharedCalendar(matePage, user).awaitEvent(anchor);
        CalendarPage mateCalendar = new CalendarPage(matePage);
        Locator privateCard = mateCalendar.eventCards()
            .filter(new Locator.FilterOptions().setHasNotText(anchor));
        privateCard.first().waitFor();

        assertThat(mateCalendar.eventTitles())
            .as("the slot of a private event shows, what it is about does not")
            .hasSize(2)
            .noneMatch(shown -> shown.contains(secret));
        privateCard.first().click();
        EventPreviewPopover preview = new EventPreviewPopover(matePage);
        PlaywrightAssertions.assertThat(preview.content())
            .containsText("Details are hidden");
        assertThat(preview.text())
            .doesNotContain(secret)
            .doesNotContain(secretPlace);
    }

    @Test
    @DisplayName("SHARE-30 A private calendar nobody shared cannot be added by another user "
        + "of the domain: browsing its owner offers no calendar")
    void aPrivateCalendarCannotBeBrowsedWithoutAShare(Page page, E2EUser user,
                                                      E2EUserFactory users,
                                                      E2ESessions sessions,
                                                      CalendarProbe probe) {
        E2EUser stranger = users.newUser("stranger");
        LoginPage.loginAs(page, user);
        seedOwnerEvent(probe, user, "Nobody else's business", 10);
        probe.setPublicRight(user, CalendarProbe.PublicRight.NONE);

        CalendarPage strangerCalendar = sessions.openFor(stranger);
        String answer = strangerCalendar.browseOtherCalendars().pickInOtherCalendars(user.email());

        assertThat(answer)
            .as("a calendar granting nothing to the domain is not offered to the domain")
            .contains("No publicly available calendars");
        strangerCalendar.cancelBrowsing();
    }

    @Test
    @DisplayName("SHARE-31 An event the owner adds reaches the grantee without a reload")
    void anEventTheOwnerAddsReachesTheGranteeLive(Page page, E2EUser user, E2EUserFactory users,
                                                  E2ESessions sessions, CalendarProbe probe) {
        E2EUser mate = users.newUser("mate");
        Page matePage = sessions.pageFor(mate);
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String first = seedOwnerEvent(probe, user, "Already there", 7);
        share(calendar, mate, "View all events");
        probe.setPublicRight(user, CalendarProbe.PublicRight.NONE);
        SharedCalendar shared = new SharedCalendar(matePage, user)
            .watchRequestsToOwnerNode(probe.requireOpenPaasId(user));
        shared.awaitEvent(first);
        CalendarPage mateCalendar = new CalendarPage(matePage).waitUntilLiveConnected();
        // the socket registers the calendars once they are listed, give it that moment
        matePage.waitForTimeout(3000);

        String title = uniqueTitle("Added while watched");
        calendar.createEvent(title);

        PlaywrightAssertions.assertThat(mateCalendar.eventCard(title).first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(PROPAGATION_MS));
        assertThat(mateCalendar.eventCard(first).count())
            .as("a live update adds to the grid, it does not duplicate what was there")
            .isEqualTo(1);
        assertThat(shared.requestsToOwnerNode()).isEmpty();
    }

    @Test
    @DisplayName("SHARE-08 The owner is named in the list of rights")
    void theOwnerIsNamedInTheListOfRights(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        CalendarModal modal = calendar.modifyCalendar(OWN_CALENDAR).tab("Access");

        assertThat(modal.text()).contains(user.email());
        assertThat(modal.text()).contains("Owner");
    }

    @Test
    @DisplayName("SHARE-19 A delegate is not offered to delete the calendar they were lent")
    void aDelegateCannotDeleteTheCalendar(Page page, E2EUser user, E2EUserFactory users,
                                          E2ESessions sessions) {
        E2EUser mate = users.newUser("mate");
        Page matePage = sessions.pageFor(mate);
        CalendarPage calendar = LoginPage.loginAs(page, user);
        share(calendar, mate, "Editor");

        awaitSharedCalendar(matePage, user);

        assertThat(menuOfSharedCalendar(matePage, user))
            .as("a borrowed calendar can be given back, never deleted for its owner")
            .noneMatch(entry -> entry.equalsIgnoreCase("Delete"));
    }

    @Test
    @DisplayName("SHARE-21 What the delegate changes reaches the owner without a reload")
    void whatTheDelegateChangesReachesTheOwnerLive(Page page, E2EUser user, E2EUserFactory users,
                                                   E2ESessions sessions) {
        E2EUser mate = users.newUser("mate");
        Page matePage = sessions.pageFor(mate);
        CalendarPage calendar = LoginPage.loginAs(page, user).waitUntilLiveConnected();
        share(calendar, mate, "Editor");

        awaitSharedCalendar(matePage, user);
        CalendarPage mateCalendar = new CalendarPage(matePage);
        String title = uniqueTitle("Live from the delegate");
        mateCalendar.createEvent().title(title).expand().calendar(user.uid()).save();

        PlaywrightAssertions.assertThat(calendar.eventCard(title).first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(PROPAGATION_MS));
    }

    @Test
    @DisplayName("SHARE-23 A calendar cannot be shared with its own owner")
    void aCalendarCannotBeSharedWithItsOwner(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        CalendarModal modal = calendar.modifyCalendar(OWN_CALENDAR).tab("Access");
        Locator search = page.getByPlaceholder("Start typing a name or email");
        search.click();
        search.pressSequentially(user.email(), new Locator.PressSequentiallyOptions().setDelay(30));
        page.waitForTimeout(3000);

        assertThat(page.locator("li[role=option]").allInnerTexts())
            .as("the owner already has every right, offering them is meaningless")
            .noneMatch(option -> option.contains(user.email()));
    }

    @Test
    @DisplayName("SHARE-20 A share outlives a fresh login on both sides")
    void aShareOutlivesAFreshLogin(Page page, E2EUser user, E2EUserFactory users,
                                   E2ESessions sessions) {
        E2EUser mate = users.newUser("mate");
        CalendarPage calendar = LoginPage.loginAs(page, user);
        share(calendar, mate, "View all events");

        Page freshMate = sessions.pageFor(mate);
        awaitSharedCalendar(freshMate, user);

        CalendarModal modal = calendar.modifyCalendar(OWN_CALENDAR).tab("Access");
        assertThat(modal.rightOf(mate.email())).isEqualTo("View all events");
        modal.close();
    }

    @Test
    @DisplayName("SHARE-17 An event a delegate creates belongs to the owner of the calendar")
    void anEventADelegateCreatesBelongsToTheOwner(Page page, E2EUser user, E2EUserFactory users,
                                                  E2ESessions sessions, CalendarProbe probe) {
        E2EUser mate = users.newUser("mate");
        Page matePage = sessions.pageFor(mate);
        CalendarPage calendar = LoginPage.loginAs(page, user);
        share(calendar, mate, "Editor");
        awaitSharedCalendar(matePage, user);

        String title = uniqueTitle("Written for the owner");
        new CalendarPage(matePage).createEvent().title(title).expand()
            .calendar(user.uid()).save();

        Awaitility.await().atMost(Duration.ofMillis(PROPAGATION_MS)).untilAsserted(() ->
            assertThat(probe.eventSummaries(user)).contains(title));
        String event = Ics.event(probe.singleEvent(user));
        assertThat(Ics.property(event, "ORGANIZER").orElseThrow())
            .as("an event written into somebody's calendar is organised by them, "
                + "not by the delegate who typed it")
            .contains(user.email());
    }

    @Test
    @DisplayName("SHARE-26 A series a delegate creates keeps its rule in the owner's calendar")
    void aSeriesADelegateCreatesKeepsItsRule(Page page, E2EUser user, E2EUserFactory users,
                                             E2ESessions sessions, CalendarProbe probe) {
        E2EUser mate = users.newUser("mate");
        Page matePage = sessions.pageFor(mate);
        CalendarPage calendar = LoginPage.loginAs(page, user);
        share(calendar, mate, "Editor");
        awaitSharedCalendar(matePage, user);

        String title = uniqueTitle("Delegated series");
        EventFormModal form = new CalendarPage(matePage).createEvent().title(title).expand()
            .calendar(user.uid());
        form.repeat().frequency(RecurrenceSection.DAILY).endsAfter(4);
        form.save();

        Awaitility.await().atMost(Duration.ofMillis(PROPAGATION_MS)).untilAsserted(() ->
            assertThat(probe.eventSummaries(user)).contains(title));
        String rule = Ics.property(Ics.master(probe.singleEvent(user)), "RRULE").orElseThrow();
        assertThat(rule)
            .as("a series written by a delegate is a series in the owner's calendar too")
            .contains("FREQ=DAILY")
            .contains("COUNT=4");
    }

    @Test
    @DisplayName("SHARE-27 A write right opens the Import tab of the borrowed calendar")
    void aWriteRightOpensTheImportTab(Page page, E2EUser user, E2EUserFactory users,
                                      E2ESessions sessions, CalendarProbe probe) {
        E2EUser mate = users.newUser("mate");
        Page matePage = sessions.pageFor(mate);
        CalendarPage calendar = LoginPage.loginAs(page, user);
        share(calendar, mate, "Editor");
        awaitSharedCalendar(matePage, user);

        CalendarModal borrowed = new CalendarPage(matePage).modifyCalendarMatching(user.uid());

        assertThat(borrowed.tabs())
            .as("a right to write into a calendar is a right to import into it")
            .anyMatch(tab -> tab.contains("Import"));
        borrowed.tab("Import").importFile(Ics.fixture("simple.ics")).startImport();
        Awaitility.await().atMost(Duration.ofMillis(PROPAGATION_MS)).untilAsserted(() ->
            assertThat(probe.eventSummaries(user))
                .as("what the delegate imported belongs in the owner's calendar")
                .contains("Imported simple one", "Imported simple two"));
    }

    @Test
    @DisplayName("SHARE-28 A reading right does not open the Import tab")
    void aReadingRightDoesNotOpenTheImportTab(Page page, E2EUser user, E2EUserFactory users,
                                              E2ESessions sessions) {
        E2EUser mate = users.newUser("mate");
        Page matePage = sessions.pageFor(mate);
        CalendarPage calendar = LoginPage.loginAs(page, user);
        share(calendar, mate, "View all events");
        awaitSharedCalendar(matePage, user);

        CalendarModal borrowed = new CalendarPage(matePage).modifyCalendarMatching(user.uid());

        assertThat(borrowed.tabs())
            .as("somebody who may only read a calendar may not write events into it")
            .noneMatch(tab -> tab.contains("Import"));
        borrowed.close();
    }

    @Test
    @DisplayName("SHARE-22 Somebody outside the domain is not offered a right")
    void somebodyOutsideTheDomainIsNotOffered(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        CalendarModal modal = calendar.modifyCalendar(OWN_CALENDAR).tab("Access");
        Locator search = page.getByPlaceholder("Start typing a name or email");
        search.click();
        search.pressSequentially("outsider1@external.test",
            new Locator.PressSequentiallyOptions().setDelay(30));
        page.waitForTimeout(3000);

        assertThat(page.locator("li[role=option]").allInnerTexts())
            .as("a calendar is shared with the people of the instance, not with the internet")
            .noneMatch(option -> option.contains("external.test"));
        modal.close();
    }


    @Test
    @DisplayName("SHARE-24 A long list of grantees stays complete and reachable")
    void aLongListOfGranteesStaysReachable(Page page, E2EUser user, E2EUserFactory users,
                                           E2ESessions sessions) {
        java.util.List<E2EUser> grantees = new java.util.ArrayList<>();
        for (int index = 0; index < 13; index++) {
            E2EUser grantee = users.newUser("mate" + index);
            grantees.add(grantee);
        }
        CalendarPage calendar = LoginPage.loginAs(page, user);

        CalendarModal modal = calendar.modifyCalendar(OWN_CALENDAR).tab("Access");
        for (E2EUser grantee : grantees) {
            modal.grantAccess(grantee.email(), "View all events");
        }
        modal.save();

        CalendarModal reopened = calendar.modifyCalendar(OWN_CALENDAR).tab("Access");
        assertThat(grantees)
            .as("every right granted has to be findable again, however many there are")
            .allSatisfy(grantee -> assertThat(reopened.hasAccessRow(grantee.email()))
                .as("the row of %s", grantee.email())
                .isTrue());
        reopened.close();
    }

}
