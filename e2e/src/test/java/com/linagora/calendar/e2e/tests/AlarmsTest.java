package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.LocalDate;
import java.util.List;
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
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.linagora.calendar.e2e.pages.RecurrenceSection;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.WaitForSelectorState;

/**
 * Reminders.
 *
 * <p>The stack has no mail server wired, so nothing here waits for a delivery. What is asserted
 * is the data that drives the scheduling — the `VALARM`, its `TRIGGER`, its `ACTION` and above
 * all its `ATTENDEE`, which is what makes a reminder personal to one participant rather than a
 * property of the meeting.
 */
class AlarmsTest extends TwakeCalendarE2ETest {

    private static String title(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    private void awaitAttached(Locator locator) {
        locator.first().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.ATTACHED));
    }

    /** The VALARM blocks of a calendar object, folding undone. */
    private static List<String> alarms(String icalendar) {
        java.util.regex.Matcher matcher = java.util.regex.Pattern
            .compile("BEGIN:VALARM(.*?)END:VALARM", java.util.regex.Pattern.DOTALL)
            .matcher(Ics.unfold(icalendar));
        List<String> found = new java.util.ArrayList<>();
        while (matcher.find()) {
            found.add(matcher.group(1));
        }
        return found;
    }

    private static String triggerOf(String alarm) {
        return Ics.property(alarm, "TRIGGER").orElseThrow();
    }

    @Test
    @DisplayName("ALARM-01 The default notification is No notification")
    void theDefaultIsNoNotification(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Quiet");

        var form = calendar.createEvent().title(title).expand();
        assertThat(form.notification()).isEqualTo("No notification");
        form.save();
        awaitAttached(calendar.eventCard(title));

        assertThat(alarms(probe.singleEvent(user)))
            .as("nobody asked to be reminded")
            .isEmpty();
    }

    @Test
    @DisplayName("ALARM-02 A ten minute reminder writes a VALARM")
    void aTenMinuteReminderWritesAnAlarm(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Reminded");

        calendar.createEvent().title(title).expand().notification("10 minutes").save();
        awaitAttached(calendar.eventCard(title));

        assertThat(alarms(probe.singleEvent(user))).singleElement()
            .satisfies(alarm -> assertThat(triggerOf(alarm)).isEqualTo("-PT10M"));
    }

    @Test
    @DisplayName("ALARM-03 Every offered duration writes the matching TRIGGER")
    void everyDurationWritesItsTrigger(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        record Reminder(String label, List<String> accepted) { }
        List<Reminder> reminders = List.of(
            new Reminder("1 minute", List.of("-PT1M", "-PT60S")),
            new Reminder("1 hour", List.of("-PT1H", "-PT60M")),
            new Reminder("1 day", List.of("-P1D", "-PT24H")),
            new Reminder("1 week", List.of("-P1W", "-P7D", "-PT168H")));

        for (Reminder reminder : reminders) {
            String title = title("Every " + reminder.label());
            calendar.createEvent().title(title).expand().notification(reminder.label()).save();
            awaitAttached(calendar.eventCard(title));

            String written = Awaitility.await().atMost(Duration.ofSeconds(30))
                .until(() -> probe.rawEvents(user).stream()
                    .filter(ical -> ical.contains("SUMMARY:" + title))
                    .findFirst()
                    .map(ical -> triggerOf(alarms(ical).getFirst()))
                    .orElse(null), java.util.Objects::nonNull);
            assertThat(written)
                .as("%s before", reminder.label())
                .isIn(reminder.accepted());
        }
    }

    @Test
    @DisplayName("ALARM-04 The reminder carries the delivery method of the account")
    void theReminderCarriesTheConfiguredAction(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Delivered");

        calendar.createEvent().title(title).expand().notification("10 minutes").save();
        awaitAttached(calendar.eventCard(title));

        assertThat(alarms(probe.singleEvent(user))).singleElement()
            .satisfies(alarm -> assertThat(Ics.property(alarm, "ACTION"))
                .as("email delivery is on by default for a fresh account")
                .hasValue("EMAIL"));
    }

    @Test
    @DisplayName("ALARM-06 Removing the notification deletes the VALARM")
    void removingTheNotificationDeletesTheAlarm(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Cancelled reminder");
        calendar.createEvent().title(title).expand().notification("10 minutes").save();
        awaitAttached(calendar.eventCard(title));
        assertThat(alarms(probe.singleEvent(user))).hasSize(1);

        var form = calendar.openEvent(title).edit().expand();
        form.notification("No notification");
        form.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(alarms(probe.singleEvent(user))).isEmpty());
    }

    @Test
    @DisplayName("ALARM-07 The preview spells the reminder out")
    void thePreviewSpellsTheReminderOut(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Announced");
        calendar.createEvent().title(title).expand().notification("10 minutes").save();
        awaitAttached(calendar.eventCard(title));

        String preview = calendar.openEvent(title).showMore().text();

        assertThat(preview.toLowerCase()).contains("10 minutes");
    }

    @Test
    @DisplayName("ALARM-08 A reminder on an all day event is accepted")
    void aReminderOnAnAllDayEvent(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("All day reminder");

        calendar.createEvent().title(title).expand().allDay().notification("1 day").save();
        awaitAttached(calendar.eventCard(title));

        assertThat(alarms(probe.singleEvent(user))).singleElement()
            .satisfies(alarm -> assertThat(triggerOf(alarm)).startsWith("-P"));
    }

    @Test
    @DisplayName("ALARM-09 A reminder on a series sits on the master, so every occurrence carries it")
    void aReminderOnASeriesCoversEveryOccurrence(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Recurring reminder");

        var form = calendar.createEvent().title(title).expand()
            .startTime("09:00").endTime("10:00").notification("10 minutes");
        form.repeat().frequency(RecurrenceSection.DAILY).endsAfter(4);
        form.save();
        awaitAttached(calendar.eventCard(title));

        String ical = probe.singleEvent(user);
        assertThat(Ics.property(Ics.master(ical), "RRULE")).isPresent();
        assertThat(alarms(Ics.master(ical)))
            .as("one reminder on the rule, not one per occurrence")
            .hasSize(1);
    }

    @Test
    @DisplayName("ALARM-10 A guest's personal reminder never touches the organizer's copy")
    void aPersonalReminderStaysPersonal(Page page, E2EUser organizer, E2EUserFactory users,
                                        E2ESessions sessions, CalendarProbe probe) {
        E2EUser guest = users.newUser();
        CalendarPage guestCalendar = sessions.openFor(guest);
        CalendarPage calendar = LoginPage.loginAs(page, organizer);
        String title = title("Shared meeting");
        calendar.createEvent().title(title).addGuest(guest.email()).save();
        awaitAttached(calendar.eventCard(title));

        guestCalendar.reload();
        awaitAttached(guestCalendar.eventCard(title));
        var personal = guestCalendar.openEvent(title).personalSettings();
        personal.notification("10 minutes");
        personal.save();

        Awaitility.await().atMost(Duration.ofSeconds(45)).untilAsserted(() ->
            assertThat(alarms(probe.singleEvent(guest)))
                .as("the guest asked to be reminded, and got their reminder")
                .hasSize(1));
        assertThat(alarms(probe.singleEvent(organizer)))
            .as("a reminder belongs to whoever set it, not to the meeting")
            .isEmpty();
    }

    @Test
    @DisplayName("ALARM-11 The reminder survives a change of time and stays relative to it")
    void theReminderSurvivesATimeChange(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Moved reminder");
        String uid = UUID.randomUUID().toString();
        LocalDate day = E2EClock.daysAheadOnBothClocks(1);
        String reminder = """
            BEGIN:VALARM
            ACTION:EMAIL
            TRIGGER:-PT10M
            ATTENDEE:mailto:%s
            SUMMARY:%s
            DESCRIPTION:%s
            END:VALARM
            """.formatted(user.email(), title, title).replace("\n", "\r\n");
        probe.putEvent(user, uid, Ical.event(uid, title, day, 9)
            .replace("END:VEVENT", reminder + "END:VEVENT"));
        assertThat(alarms(probe.singleEvent(user))).singleElement()
            .satisfies(saved -> assertThat(triggerOf(saved)).isEqualTo("-PT10M"));

        calendar.reload().goToDate(day);
        awaitAttached(calendar.eventCardOn(title, day));
        var form = calendar.openEventOn(title, day).edit().expand();
        form.startTime("16:00").endTime("17:00");
        form.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() -> {
            String ical = probe.singleEvent(user);
            assertThat(Ics.property(Ics.event(ical), "DTSTART").orElseThrow()).contains("T160000");
            assertThat(alarms(ical)).singleElement()
                .satisfies(alarm -> assertThat(triggerOf(alarm))
                    .as("a relative trigger follows the event, it is not recomputed into a date")
                    .isEqualTo("-PT10M"));
        });
    }

    @Test
    @DisplayName("ALARM-12 The organizer's own reminder names the organizer")
    void theOrganizerReminderNamesTheOrganizer(Page page, E2EUser organizer, E2EUserFactory users,
                                               CalendarProbe probe) {
        E2EUser guest = users.newUser();
        CalendarPage calendar = LoginPage.loginAs(page, organizer);
        String title = title("Whose reminder");

        calendar.createEvent().title(title).addGuest(guest.email())
            .expand().notification("10 minutes").save();
        awaitAttached(calendar.eventCard(title));

        assertThat(alarms(probe.singleEvent(organizer))).singleElement()
            .satisfies(alarm -> assertThat(Ics.property(alarm, "ATTENDEE").orElseThrow())
                .as("the reminder is addressed to the person who asked for it")
                .contains(organizer.email())
                .doesNotContain(guest.email()));
    }

    @Test
    @DisplayName("ALARM-13 A guest invited to a reminded event does not inherit the reminder")
    void aGuestDoesNotInheritTheReminder(Page page, E2EUser organizer, E2EUserFactory users,
                                         E2ESessions sessions, CalendarProbe probe) {
        E2EUser guest = users.newUser();
        CalendarPage guestCalendar = sessions.openFor(guest);
        CalendarPage calendar = LoginPage.loginAs(page, organizer);
        String title = title("Not yours");

        calendar.createEvent().title(title).addGuest(guest.email())
            .expand().notification("10 minutes").save();
        awaitAttached(calendar.eventCard(title));
        guestCalendar.reload();
        awaitAttached(guestCalendar.eventCard(title));

        Awaitility.await().atMost(Duration.ofSeconds(45)).untilAsserted(() ->
            assertThat(probe.eventSummaries(guest)).contains(title));
        assertThat(alarms(probe.singleEvent(guest)))
            .as("being invited is not asking to be woken up")
            .allSatisfy(alarm -> assertThat(Ics.property(alarm, "ATTENDEE").orElse(""))
                .doesNotContain(organizer.email()));
    }

    @Test
    @DisplayName("ALARM-15 Deleting the event takes its reminder with it")
    void deletingTheEventTakesTheReminder(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("Doomed reminder");
        calendar.createEvent().title(title).expand().notification("10 minutes").save();
        awaitAttached(calendar.eventCard(title));
        assertThat(alarms(probe.singleEvent(user))).hasSize(1);

        calendar.openEvent(title).delete();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(probe.rawEvents(user))
                .as("no event, no reminder left behind to fire into the void")
                .isEmpty());
    }

    @Test
    @DisplayName("ALARM-16 A reminder set on one occurrence lands on the exception alone")
    void aReminderOnOneOccurrenceStaysThere(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = title("One occurrence only");
        var form = calendar.createEvent().title(title).expand().startTime("09:00").endTime("10:00");
        form.repeat().frequency(RecurrenceSection.DAILY).endsAfter(4);
        form.save();
        awaitAttached(calendar.eventCard(title));
        calendar.reload();

        var occurrence = calendar.openEvent(title)
            .edit(com.linagora.calendar.e2e.pages.EventFormModal.Scope.THIS_EVENT).expand();
        occurrence.notification("10 minutes");
        occurrence.save();

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() -> {
            String ical = probe.singleEvent(user);
            assertThat(Ics.overrides(ical)).hasSize(1);
            assertThat(alarms(Ics.overrides(ical).getFirst()))
                .as("the occurrence that was edited carries the reminder")
                .hasSize(1);
            assertThat(alarms(Ics.master(ical)))
                .as("the rest of the series was not signed up for it")
                .isEmpty();
        });
    }
}
