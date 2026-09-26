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
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.PlaywrightAssertions;
import com.microsoft.playwright.options.WaitForSelectorState;

class EventEditionTest extends TwakeCalendarE2ETest {

    private void awaitAttached(Locator locator) {
        locator.first().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.ATTACHED));
    }

    private static String uniqueTitle(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    @Test
    @DisplayName("EDIT-01 Renaming an event updates both the grid and CalDAV")
    void renamingAnEventUpdatesTheGridAndCalDav(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String initial = uniqueTitle("Draft name");
        String renamed = uniqueTitle("Final name");
        calendar.createEvent(initial);

        calendar.openEvent(initial).edit().title(renamed).save();

        PlaywrightAssertions.assertThat(calendar.eventCard(renamed).first()).isAttached();
        assertThat(calendar.eventCard(initial)).satisfies(card -> assertThat(card.count()).isZero());
        Awaitility.await().atMost(Duration.ofSeconds(20)).untilAsserted(() ->
            assertThat(probe.eventSummaries(user)).containsExactly(renamed));
    }

    @Test
    @DisplayName("EDIT-02 Changing the start time of an event is persisted")
    void changingTheStartTimeUpdatesTheEvent(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Moved");
        calendar.createEvent(title);

        calendar.openEvent(title).edit()
            .expand()
            .startTime("09:00")
            .endTime("10:30")
            .save();
        calendar.eventCard(title).first().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.ATTACHED));

        Awaitility.await().atMost(Duration.ofSeconds(20)).untilAsserted(() ->
            assertThat(calendar.eventCard(title).first().innerText()).contains("09:00"));
        assertThat(probe.rawEvents(user))
            .singleElement()
            .satisfies(ical -> assertThat(ical).contains("T090000"));
    }

    @Test
    @DisplayName("EDIT-03 Deleting an event removes it from the grid and from CalDAV")
    void deletingAnEventRemovesItEverywhere(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Cancelled");
        calendar.createEvent(title);

        calendar.openEvent(title).delete();

        PlaywrightAssertions.assertThat(calendar.eventCard(title)).hasCount(0);
        Awaitility.await().atMost(Duration.ofSeconds(20)).untilAsserted(() ->
            assertThat(probe.eventSummaries(user)).isEmpty());
    }

    @Test
    @DisplayName("EDIT-04 Cancelling the edit form leaves the event untouched")
    void cancellingTheFormLeavesTheEventUntouched(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Keep me");
        calendar.createEvent(title);

        calendar.openEvent(title).edit().title("Should never be saved").cancel();
        page.waitForTimeout(1500);

        assertThat(probe.eventSummaries(user)).containsExactly(title);
    }

    @Test
    @DisplayName("EDIT-05 Clicking an event opens its preview with title, times and calendar")
    void thePreviewShowsTheEssentials(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Previewed");
        calendar.createEvent().title(title).expand().startTime("09:00").endTime("10:00").save();
        awaitAttached(calendar.eventCard(title));

        String preview = calendar.openEvent(title).text();

        assertThat(preview).contains(title).contains("09:00").contains("My calendar");
    }

    @Test
    @DisplayName("EDIT-06 The preview exposes the Edit, Delete and Export actions")
    void thePreviewExposesItsActions(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Actionable");
        calendar.createEvent(title);

        calendar.openEvent(title);

        PlaywrightAssertions.assertThat(page.getByLabel("Edit event")).isVisible();
        PlaywrightAssertions.assertThat(page.getByLabel("Delete event")).isVisible();
        PlaywrightAssertions.assertThat(page.getByLabel("Export event details to .ics file")).isVisible();
    }

    @Test
    @DisplayName("EDIT-07 The edit form is prefilled with the values of the event")
    void theEditFormIsPrefilled(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Prefilled");
        calendar.createEvent().title(title).expand()
            .startTime("14:00").endTime("15:00")
            .description("Bring the deck").location("Room 42").save();
        awaitAttached(calendar.eventCard(title));

        var form = calendar.openEvent(title).edit().expand();

        assertThat(form.title()).isEqualTo(title);
        assertThat(form.startTime()).isEqualTo("14:00");
        assertThat(form.endTime()).isEqualTo("15:00");
        assertThat(form.description()).isEqualTo("Bring the deck");
        assertThat(form.location()).isEqualTo("Room 42");
    }

    @Test
    @DisplayName("EDIT-08 Adding a description to an existing event is persisted")
    void addingADescriptionIsPersisted(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Described later");
        calendar.createEvent(title);

        var form = calendar.openEvent(title).edit().expand();
        form.description("Added afterwards");
        form.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(probe.singleEvent(user)).contains("Added afterwards"));
    }

    @Test
    @DisplayName("EDIT-09 Removing the location of an existing event is persisted")
    void removingTheLocationIsPersisted(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Located");
        calendar.createEvent().title(title).expand().location("Room 42").save();
        awaitAttached(calendar.eventCard(title));
        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(probe.singleEvent(user)).contains("Room 42"));

        var form = calendar.openEvent(title).edit().expand();
        form.location("");
        form.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(probe.singleEvent(user)).doesNotContain("Room 42"));
    }

    @Test
    @DisplayName("EDIT-10 Changing the date of an event moves it to another column")
    void changingTheDateMovesTheColumn(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Rescheduled");
        java.time.LocalDate target = calendar.anotherDayOfTheWeekOnScreen();
        calendar.createEvent(title);

        var form = calendar.openEvent(title).edit().expand();
        form.startDate(target);
        form.save();

        PlaywrightAssertions.assertThat(calendar.dayColumn(target).locator(CalendarPage.EVENT_CARD)
                .filter(new Locator.FilterOptions().setHasText(title)).first())
            .isAttached(new com.microsoft.playwright.assertions.LocatorAssertions.IsAttachedOptions().setTimeout(30_000));
    }

    @Test
    @DisplayName("EDIT-11 Turning an event into an all day one moves it to the all day row")
    void turningAnEventIntoAllDay(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Becoming all day");
        calendar.createEvent(title);

        var form = calendar.openEvent(title).edit().expand();
        form.allDay();
        form.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(com.linagora.calendar.e2e.backend.Ics.parameters(
                com.linagora.calendar.e2e.backend.Ics.event(probe.singleEvent(user)), "DTSTART"))
                .contains("VALUE=DATE"));
        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(calendar.allDayEventCards().allInnerTexts())
                .anySatisfy(text -> assertThat(text).contains(title)));
    }

    @Test
    @DisplayName("EDIT-12 Turning an all day event back into a timed one restores valid hours")
    void turningAnAllDayEventBackToTimed(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Back to hours");
        calendar.createEvent().title(title).expand().allDay().save();
        awaitAttached(calendar.eventCard(title));

        var form = calendar.openEvent(title).edit().expand();
        form.notAllDay();
        assertThat(form.startTime()).matches("\\d{2}:\\d{2}");
        form.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(com.linagora.calendar.e2e.backend.Ics.parameters(
                com.linagora.calendar.e2e.backend.Ics.event(probe.singleEvent(user)), "DTSTART"))
                .doesNotContain("VALUE=DATE"));
    }

    @Test
    @DisplayName("EDIT-13 Moving an event to another personal calendar changes its colour")
    void movingToAnotherCalendarChangesTheColour(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String other = "Other " + UUID.randomUUID().toString().substring(0, 6);
        calendar.addCalendar().name(other).color("#F5CFD0").create();
        PlaywrightAssertions.assertThat(calendar.calendarCheckbox(other)).isVisible();

        String title = uniqueTitle("Moving house");
        calendar.createEvent(title);
        String before = cardColour(page, title);

        var form = calendar.openEvent(title).edit().expand();
        form.calendar(other);
        form.save();

        // the card is redrawn once the move has gone through, and under load that is a good deal
        // later than the save returning: watch for the colour to change rather than guess when
        org.awaitility.Awaitility.await().atMost(Duration.ofSeconds(45))
            .pollInterval(Duration.ofSeconds(1))
            .untilAsserted(() -> assertThat(cardColour(page, title))
                .as("an event carries the colour of the calendar it lives in")
                .isNotEqualTo(before));
    }

    private static String cardColour(Page page, String title) {
        return String.valueOf(page.evaluate("(t) => { const e = Array.from("
            + "document.querySelectorAll('[data-testid^=event-card]')).find(n => n.innerText.includes(t));"
            + " return e ? getComputedStyle(e).backgroundColor : 'none'; }", title));
    }

    @Test
    @DisplayName("EDIT-14 Closing the preview with Escape changes nothing")
    void escapeOnThePreviewChangesNothing(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Untouched");
        calendar.createEvent(title);

        calendar.openEvent(title).close();
        page.waitForTimeout(1200);

        PlaywrightAssertions.assertThat(page.getByLabel("Edit event")).hasCount(0);
        assertThat(probe.eventSummaries(user)).containsExactly(title);
    }

    @Test
    @DisplayName("EDIT-18 Deletion is immediate in the grid, with no reload")
    void deletionIsImmediate(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Gone at once");
        calendar.createEvent(title);

        calendar.openEvent(title).delete();

        PlaywrightAssertions.assertThat(calendar.eventCard(title))
            .hasCount(0, new com.microsoft.playwright.assertions.LocatorAssertions.HasCountOptions().setTimeout(10_000));
    }

    @Test
    @DisplayName("EDIT-19 Editing an event then cancelling restores the original display")
    void cancellingRestoresTheOriginalDisplay(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Reverted");
        calendar.createEvent(title);

        var form = calendar.openEvent(title).edit();
        form.title("Something else entirely");
        form.cancel();
        page.waitForTimeout(1500);

        PlaywrightAssertions.assertThat(calendar.eventCard(title).first()).isAttached();
        PlaywrightAssertions.assertThat(calendar.eventCard("Something else entirely")).hasCount(0);
    }

    @Test
    @DisplayName("EDIT-20 Two successive edits of the same event are both persisted")
    void twoSuccessiveEditsArePersisted(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("First");
        calendar.createEvent(title);

        String second = uniqueTitle("Second");
        var first = calendar.openEvent(title).edit();
        first.title(second);
        first.save();
        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(probe.eventSummaries(user)).containsExactly(second));

        var again = calendar.openEvent(second).edit().expand();
        again.location("Room 7");
        again.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() -> {
            String ical = probe.singleEvent(user);
            assertThat(ical).contains("SUMMARY:" + second).contains("Room 7");
        });
    }

    @Test
    @DisplayName("EDIT-15 Duplicating an event creates an independent copy")
    void duplicatingCreatesACopy(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Original");
        calendar.createEvent().title(title).expand().location("Room 1").save();
        awaitAttached(calendar.eventCard(title));

        var copy = calendar.openEvent(title).duplicate();
        assertThat(copy.title()).contains(title);
        String copyTitle = uniqueTitle("Copy");
        copy.title(copyTitle);
        copy.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(probe.eventSummaries(user)).containsExactlyInAnyOrder(title, copyTitle));
    }

    @Test
    @DisplayName("EDIT-16 Editing the duplicate leaves the original untouched")
    void editingTheCopyLeavesTheOriginalAlone(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Master copy");
        calendar.createEvent().title(title).expand().location("Room 1").save();
        awaitAttached(calendar.eventCard(title));

        String copyTitle = uniqueTitle("Duplicate");
        var copy = calendar.openEvent(title).duplicate();
        copy.title(copyTitle);
        copy.save();
        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(probe.eventSummaries(user)).hasSize(2));

        var edited = calendar.openEvent(copyTitle).edit().expand();
        edited.location("Room 9");
        edited.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() -> {
            var originals = probe.rawEvents(user).stream()
                .filter(ical -> ical.contains("SUMMARY:" + title))
                .toList();
            assertThat(originals).hasSize(1);
            assertThat(originals.getFirst())
                .as("the copy and the original are two events, not two views of one")
                .contains("Room 1")
                .doesNotContain("Room 9");
        });
    }

    @Test
    @DisplayName("EDIT-17 Exporting an event downloads an .ics carrying its UID")
    void exportingDownloadsTheIcs(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Exported");
        calendar.createEvent(title);
        String uid = com.linagora.calendar.e2e.backend.Ics.property(
            com.linagora.calendar.e2e.backend.Ics.event(probe.singleEvent(user)), "UID").orElseThrow();

        String exported = calendar.openEvent(title).export();

        assertThat(exported)
            .contains("BEGIN:VCALENDAR")
            .contains("UID:" + uid)
            .contains("SUMMARY:" + title);
    }
}
