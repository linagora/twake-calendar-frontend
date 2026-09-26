package com.linagora.calendar.e2e.tests;

import static com.linagora.calendar.e2e.pages.EventFormModal.Scope.ALL_EVENTS;
import static com.linagora.calendar.e2e.pages.EventFormModal.Scope.THIS_EVENT;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
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
import com.linagora.calendar.e2e.pages.EventFormModal;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.linagora.calendar.e2e.pages.RecurrenceSection;
import com.linagora.calendar.e2e.pages.ScopeDialog;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.LocatorAssertions;
import com.microsoft.playwright.assertions.PlaywrightAssertions;
import com.microsoft.playwright.options.WaitForSelectorState;

/** Editing and deleting a recurring event: the scope dialog and what it does to the series. */
class RecurrenceEditionTest extends TwakeCalendarE2ETest {

    private static String title(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    private void awaitAttached(Locator locator) {
        locator.first().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.ATTACHED));
    }

    /** A daily series of the given length, starting today at 09:00, guests included. */
    private String dailySeries(CalendarPage calendar, int occurrences, String... guests) {
        String title = title("Daily");
        EventFormModal form = calendar.createEvent().title(title);
        for (String guest : guests) {
            form.addGuest(guest);
        }
        // The series starts on the first day the grid shows, never on "today": a daily series
        // begun on a Friday runs into next week, and the occurrences that land there are simply
        // not on screen to be counted. Anchoring it to the visible week keeps every occurrence
        // of a week or less in view whatever day the suite runs.
        LocalDate weekStart = calendar.firstVisibleDate();
        form.expand().startDate(weekStart).endDate(weekStart).startTime("09:00").endTime("10:00");
        form.repeat().frequency(RecurrenceSection.DAILY).endsAfter(occurrences);
        form.save();
        awaitAttached(calendar.eventCard(title));
        calendar.page().reload();
        calendar.waitUntilLoaded();
        awaitAttached(calendar.eventCard(title));
        return title;
    }

    private String master(CalendarProbe probe, E2EUser user) {
        return Ics.master(probe.singleEvent(user));
    }

    @Test
    @DisplayName("RECUR-EDIT-01 Editing an occurrence opens the This event / All the events dialog")
    void editingAnOccurrenceOpensTheScopeDialog(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = dailySeries(calendar, 4);

        calendar.openEvent(title).clickEdit();

        ScopeDialog dialog = ScopeDialog.waitFor(page);
        assertThat(dialog.title()).isEqualTo("Update the recurrent event");
        PlaywrightAssertions.assertThat(dialog.thisEventRadio()).isChecked();
        PlaywrightAssertions.assertThat(dialog.allEventsRadio()).not().isChecked();
    }

    @Test
    @DisplayName("RECUR-EDIT-02 Cancelling that dialog modifies no occurrence")
    void cancellingTheScopeDialogChangesNothing(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = dailySeries(calendar, 4);
        String before = probe.singleEvent(user);

        calendar.openEvent(title).clickEdit();
        ScopeDialog.waitFor(page).cancel();
        page.waitForTimeout(1500);

        assertThat(Ics.property(master(probe, user), "SUMMARY")).hasValue(title);
        assertThat(Ics.overrides(probe.singleEvent(user))).isEmpty();
        assertThat(before).contains("SUMMARY:" + title);
    }

    @Test
    @DisplayName("RECUR-EDIT-03 Renaming this event only renames the clicked occurrence")
    void renamingOneOccurrenceLeavesTheOthers(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = dailySeries(calendar, 4);
        String renamed = title("Just this one");

        var form = calendar.openEvent(title).edit(THIS_EVENT);
        form.title(renamed);
        form.save();

        PlaywrightAssertions.assertThat(calendar.eventCard(renamed).first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(30_000));
        PlaywrightAssertions.assertThat(calendar.eventCard(title).first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(30_000));
    }

    @Test
    @DisplayName("RECUR-EDIT-04 Renaming this event writes an exception carrying RECURRENCE-ID")
    void renamingOneOccurrenceWritesAnException(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = dailySeries(calendar, 4);
        String renamed = title("Exception");

        var form = calendar.openEvent(title).edit(THIS_EVENT);
        form.title(renamed);
        form.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() -> {
            List<String> overrides = Ics.overrides(probe.singleEvent(user));
            assertThat(overrides).hasSize(1);
            assertThat(Ics.property(overrides.getFirst(), "SUMMARY")).hasValue(renamed);
            assertThat(Ics.property(overrides.getFirst(), "RECURRENCE-ID")).isPresent();
        });
    }

    @Test
    @DisplayName("RECUR-EDIT-05 Renaming all the events renames the whole series")
    void renamingTheSeriesRenamesEverything(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = dailySeries(calendar, 4);
        String renamed = title("All of them");
        int before = calendar.eventCard(title).count();

        var form = calendar.openEvent(title).edit(ALL_EVENTS);
        form.title(renamed);
        form.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(Ics.property(master(probe, user), "SUMMARY")).hasValue(renamed));
        PlaywrightAssertions.assertThat(calendar.eventCard(renamed))
            .hasCount(before, new LocatorAssertions.HasCountOptions().setTimeout(30_000));
    }

    @Test
    @DisplayName("RECUR-EDIT-06 Moving the time of a single occurrence leaves the others in place")
    void movingOneOccurrenceLeavesTheOthers(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = dailySeries(calendar, 4);

        var form = calendar.openEvent(title).edit(THIS_EVENT).expand();
        form.startTime("15:00").endTime("16:00");
        form.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() -> {
            String ical = probe.singleEvent(user);
            assertThat(Ics.overrides(ical)).hasSize(1);
            assertThat(Ics.property(Ics.overrides(ical).getFirst(), "DTSTART").orElseThrow())
                .contains("T150000");
            assertThat(Ics.property(Ics.master(ical), "DTSTART").orElseThrow())
                .as("the series itself has not moved")
                .contains("T090000");
        });
    }

    @Test
    @DisplayName("RECUR-EDIT-07 Moving the time of the whole series shifts every occurrence")
    void movingTheSeriesShiftsEveryOccurrence(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = dailySeries(calendar, 4);

        var form = calendar.openEvent(title).edit(ALL_EVENTS).expand();
        form.startTime("16:00").endTime("17:00");
        form.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(Ics.property(master(probe, user), "DTSTART").orElseThrow())
                .contains("T160000"));
        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(calendar.eventCard(title).first().innerText()).contains("16:00"));
    }

    @Test
    @DisplayName("RECUR-EDIT-08 Deleting an occurrence opens the two choice deletion dialog")
    void deletingAnOccurrenceOpensTheScopeDialog(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = dailySeries(calendar, 4);

        calendar.openEvent(title);
        page.getByLabel("Delete event").click();

        ScopeDialog dialog = ScopeDialog.waitFor(page);
        assertThat(dialog.title()).isEqualTo("Delete the recurrent event");
        PlaywrightAssertions.assertThat(dialog.allEventsRadio()).isVisible();
    }

    @Test
    @DisplayName("RECUR-EDIT-09 Deleting this event removes one occurrence and adds an EXDATE")
    void deletingOneOccurrenceAddsAnExdate(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = dailySeries(calendar, 4);
        int before = calendar.eventCard(title).count();

        calendar.openEvent(title).delete(THIS_EVENT);

        PlaywrightAssertions.assertThat(calendar.eventCard(title))
            .hasCount(before - 1, new LocatorAssertions.HasCountOptions().setTimeout(30_000));
        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(Ics.properties(master(probe, user), "EXDATE")).hasSize(1));
    }

    @Test
    @DisplayName("RECUR-EDIT-10 Deleting all the events clears the series from the calendar")
    void deletingTheSeriesClearsIt(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = dailySeries(calendar, 4);

        calendar.openEvent(title).delete(ALL_EVENTS);

        PlaywrightAssertions.assertThat(calendar.eventCard(title))
            .hasCount(0, new LocatorAssertions.HasCountOptions().setTimeout(30_000));
        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(probe.eventSummaries(user)).isEmpty());
    }

    @Test
    @DisplayName("RECUR-EDIT-11 Changing the frequency from daily to weekly on the whole series")
    void changingTheFrequencyOfTheSeries(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = dailySeries(calendar, 4);

        var form = calendar.openEvent(title).edit(ALL_EVENTS).expand();
        form.repeat().frequency(RecurrenceSection.WEEKLY);
        form.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(Ics.rulePart(Ics.property(master(probe, user), "RRULE").orElseThrow(), "FREQ"))
                .hasValue("WEEKLY"));
    }

    @Test
    @DisplayName("RECUR-EDIT-12 Raising the occurrence count brings the missing occurrences back")
    void raisingTheCountBringsOccurrencesBack(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = dailySeries(calendar, 2);
        int before = calendar.eventCard(title).count();

        var form = calendar.openEvent(title).edit(ALL_EVENTS).expand();
        form.repeat().endsAfter(5);
        form.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(Ics.rulePart(Ics.property(master(probe, user), "RRULE").orElseThrow(), "COUNT"))
                .hasValue("5"));
        PlaywrightAssertions.assertThat(calendar.eventCard(title).nth(before))
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(30_000));
    }

    @Test
    @DisplayName("RECUR-EDIT-13 Lowering the occurrence count removes the extra occurrences")
    void loweringTheCountRemovesOccurrences(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = dailySeries(calendar, 5);

        var form = calendar.openEvent(title).edit(ALL_EVENTS).expand();
        form.repeat().endsAfter(2);
        form.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(Ics.rulePart(Ics.property(master(probe, user), "RRULE").orElseThrow(), "COUNT"))
                .hasValue("2"));
        PlaywrightAssertions.assertThat(calendar.eventCard(title))
            .hasCount(2, new LocatorAssertions.HasCountOptions().setTimeout(30_000));
    }

    @Test
    @DisplayName("RECUR-EDIT-14 Pushing the end date further extends the series")
    void pushingTheEndDateExtendsTheSeries(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Bounded");
        // anchored to the week on screen so that both the short series and the extended one
        // stay countable: bounds taken from today put half the occurrences in next week
        LocalDate weekStart = calendar.firstVisibleDate();
        var creation = calendar.createEvent().title(title).expand()
            .startDate(weekStart).endDate(weekStart).startTime("09:00").endTime("10:00");
        creation.repeat().frequency(RecurrenceSection.DAILY).endsOn(weekStart.plusDays(1));
        creation.save();
        awaitAttached(calendar.eventCard(title));
        page.reload();
        calendar.waitUntilLoaded();
        int before = calendar.eventCard(title).count();

        var form = calendar.openEvent(title).edit(ALL_EVENTS).expand();
        form.repeat().endsOn(weekStart.plusDays(4));
        form.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(calendar.eventCard(title).count())
                .as("a later end date means more occurrences")
                .isGreaterThan(before));
        assertThat(Ics.rulePart(Ics.property(master(probe, user), "RRULE").orElseThrow(), "UNTIL"))
            .isPresent();
    }

    @Test
    @DisplayName("RECUR-EDIT-15 Making a recurring event non recurring leaves a single occurrence")
    void makingASeriesNonRecurring(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = dailySeries(calendar, 4);

        var form = calendar.openEvent(title).edit(ALL_EVENTS).expand();
        form.doesNotRepeat();
        form.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(Ics.property(Ics.event(probe.singleEvent(user)), "RRULE")).isEmpty());
        PlaywrightAssertions.assertThat(calendar.eventCard(title))
            .hasCount(1, new LocatorAssertions.HasCountOptions().setTimeout(30_000));
    }

    @Test
    @DisplayName("RECUR-EDIT-16 Making a single event recurring creates the following occurrences")
    void makingASingleEventRecurring(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Was alone");
        // from the first day of the week on screen, or the occurrences run off it on a weekend
        calendar.createEvent().title(title).expand()
            .startDate(calendar.firstVisibleDate()).startTime("09:00").endTime("10:00").save();
        awaitAttached(calendar.eventCard(title));

        var form = calendar.openEvent(title).edit().expand();
        form.repeat().frequency(RecurrenceSection.DAILY).endsAfter(3);
        form.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(Ics.rulePart(Ics.property(master(probe, user), "RRULE").orElseThrow(), "COUNT"))
                .hasValue("3"));
        PlaywrightAssertions.assertThat(calendar.eventCard(title))
            .hasCount(3, new LocatorAssertions.HasCountOptions().setTimeout(30_000));
    }

    @Test
    @DisplayName("RECUR-EDIT-18 Deleting an exception occurrence does not break the rest of the series")
    void deletingAnExceptionKeepsTheSeries(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = dailySeries(calendar, 5);
        String exception = title("Moved one");

        var occurrence = calendar.openEvent(title).edit(THIS_EVENT);
        occurrence.title(exception);
        occurrence.save();
        awaitAttached(calendar.eventCard(exception));
        int remaining = calendar.eventCard(title).count();

        calendar.openEvent(exception).delete(THIS_EVENT);

        PlaywrightAssertions.assertThat(calendar.eventCard(exception))
            .hasCount(0, new LocatorAssertions.HasCountOptions().setTimeout(30_000));
        PlaywrightAssertions.assertThat(calendar.eventCard(title))
            .hasCount(remaining, new LocatorAssertions.HasCountOptions().setTimeout(30_000));
        assertThat(Ics.property(master(probe, user), "RRULE")).isPresent();
    }

    @Test
    @DisplayName("RECUR-EDIT-19 Adding a guest to a single occurrence leaves the others alone")
    void addingAGuestToOneOccurrence(Page page, E2EUser user, E2EUserFactory users, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        E2EUser guest = users.newUser();
        String title = dailySeries(calendar, 4);

        var form = calendar.openEvent(title).edit(THIS_EVENT);
        form.addGuest(guest.email());
        form.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() -> {
            String ical = probe.singleEvent(user);
            assertThat(Ics.overrides(ical)).hasSize(1);
            assertThat(Ics.overrides(ical).getFirst()).contains(guest.email());
            assertThat(Ics.master(ical))
                .as("the rest of the series was not invited")
                .doesNotContain(guest.email());
        });
    }

    @Test
    @DisplayName("RECUR-EDIT-20 Adding a guest to the whole series invites them on every occurrence")
    void addingAGuestToTheSeries(Page page, E2EUser user, E2EUserFactory users,
                                 E2ESessions sessions, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        E2EUser guest = users.newUser();
        CalendarPage guestCalendar = sessions.openFor(guest);
        String title = dailySeries(calendar, 4);

        var form = calendar.openEvent(title).edit(ALL_EVENTS);
        form.addGuest(guest.email());
        form.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(Ics.master(probe.singleEvent(user))).contains(guest.email()));
        guestCalendar.page().reload();
        guestCalendar.waitUntilLoaded();
        PlaywrightAssertions.assertThat(guestCalendar.eventCard(title))
            .hasCount(4, new LocatorAssertions.HasCountOptions().setTimeout(45_000));
    }

    @Test
    @DisplayName("RECUR-EDIT-21 Answering on a single occurrence opens the participation dialog")
    void answeringOnOneOccurrenceOpensTheDialog(Page page, E2EUser organizer, E2EUserFactory users,
                                                E2ESessions sessions) {
        CalendarPage calendar = LoginPage.loginAs(page, organizer);
        E2EUser guest = users.newUser();
        CalendarPage guestCalendar = sessions.openFor(guest);
        String title = dailySeries(calendar, 4, guest.email());

        guestCalendar.page().reload();
        guestCalendar.waitUntilLoaded();
        awaitAttached(guestCalendar.eventCard(title));
        guestCalendar.openEvent(title).answer("Yes");

        ScopeDialog dialog = ScopeDialog.waitFor(guestCalendar.page());
        assertThat(dialog.title()).isEqualTo("Update the participation status");
    }

    @Test
    @DisplayName("RECUR-EDIT-22 Answering for the whole series applies the status everywhere")
    void answeringForTheWholeSeries(Page page, E2EUser organizer, E2EUserFactory users,
                                    E2ESessions sessions, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, organizer);
        E2EUser guest = users.newUser();
        CalendarPage guestCalendar = sessions.openFor(guest);
        String title = dailySeries(calendar, 4, guest.email());

        guestCalendar.page().reload();
        guestCalendar.waitUntilLoaded();
        awaitAttached(guestCalendar.eventCard(title));
        guestCalendar.openEvent(title).answer("Yes", ALL_EVENTS);

        Awaitility.await().atMost(Duration.ofSeconds(60)).untilAsserted(() -> {
            String ical = Ics.unfold(probe.singleEvent(guest));
            assertThat(ical).contains("PARTSTAT=ACCEPTED");
            assertThat(Ics.overrides(ical))
                .as("the whole series answered at once, no exception needed")
                .isEmpty();
        });
    }

    @Test
    @DisplayName("RECUR-EDIT-23 The preview of an occurrence carries the Recurrent Event badge")
    void thePreviewCarriesTheRecurrentBadge(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = dailySeries(calendar, 3);

        assertThat(calendar.openEvent(title).text()).contains("Recurrent Event");
    }

    @Test
    @DisplayName("RECUR-EDIT-24 Moving a recurring series to another calendar keeps its rule")
    void movingASeriesToAnotherCalendarKeepsItsRule(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String other = "Other " + UUID.randomUUID().toString().substring(0, 6);
        calendar.addCalendar().name(other).create();
        PlaywrightAssertions.assertThat(calendar.calendarCheckbox(other)).isVisible();
        String title = dailySeries(calendar, 4);
        int before = calendar.eventCard(title).count();
        String colourBefore = cardColour(page, title);

        var form = calendar.openEvent(title).edit(ALL_EVENTS).expand();
        form.calendar(other);
        form.save();

        // every occurrence is still there, so the rule survived the move, and they now wear the
        // colour of their new calendar, which is how one can tell the move happened at all
        PlaywrightAssertions.assertThat(calendar.eventCard(title))
            .hasCount(before, new LocatorAssertions.HasCountOptions().setTimeout(45_000));
        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(cardColour(page, title))
                .as("the whole series moved to %s", other)
                .isNotEqualTo(colourBefore));
    }

    @Test
    @DisplayName("RECUR-EDIT-25 Answering on a single occurrence writes that answer as an exception")
    void answeringOnOneOccurrenceWritesAnException(Page page, E2EUser organizer, E2EUserFactory users,
                                                   E2ESessions sessions, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, organizer);
        E2EUser guest = users.newUser();
        CalendarPage guestCalendar = sessions.openFor(guest);
        String title = dailySeries(calendar, 4, guest.email());

        guestCalendar.page().reload();
        guestCalendar.waitUntilLoaded();
        awaitAttached(guestCalendar.eventCard(title));
        guestCalendar.openEvent(title).answer("Yes", THIS_EVENT);

        // answering a single occurrence reads the calendar object back before writing the
        // exception: reading it as ICS while the DAV proxy answers jCal threw, and the answer
        // was then dropped without a word. See #1375.
        Awaitility.await().atMost(Duration.ofSeconds(60)).untilAsserted(() -> {
            List<String> overrides = Ics.overrides(probe.singleEvent(guest));
            assertThat(overrides).hasSize(1);
            assertThat(Ics.property(overrides.getFirst(), "RECURRENCE-ID")).isPresent();
            assertThat(attendeeLine(overrides.getFirst(), guest.email()))
                .contains("PARTSTAT=ACCEPTED");
        });
        assertThat(attendeeLine(Ics.master(probe.singleEvent(guest)), guest.email()))
            .as("only the clicked occurrence was answered, the series itself is still waiting")
            .doesNotContain("PARTSTAT=ACCEPTED");
    }

    /** The ATTENDEE line of one participant inside a VEVENT, folding already undone. */
    private static String attendeeLine(String vevent, String email) {
        return Arrays.stream(vevent.split("\r?\n"))
            .filter(line -> line.startsWith("ATTENDEE") && line.contains(email))
            .findFirst()
            .orElseThrow(() -> new AssertionError(email + " is not an attendee of:\n" + vevent));
    }

    private static String cardColour(Page page, String title) {
        return String.valueOf(page.evaluate("(t) => { const e = Array.from("
            + "document.querySelectorAll('[data-testid^=event-card]')).find(n => n.innerText.includes(t));"
            + " return e ? getComputedStyle(e).backgroundColor : 'none'; }", title));
    }
}
