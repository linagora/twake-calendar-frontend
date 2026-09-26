package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.CalendarProbe;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.backend.E2EUserFactory;
import com.linagora.calendar.e2e.backend.Ics;
import com.linagora.calendar.e2e.docker.E2EClock;
import com.linagora.calendar.e2e.docker.E2ESessions;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.EventFormModal;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.linagora.calendar.e2e.pages.RecurrenceSection;
import com.linagora.calendar.e2e.pages.ScopeDialog;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.PlaywrightAssertions;
import com.microsoft.playwright.options.WaitForSelectorState;

/**
 * Moving and resizing events with the mouse.
 *
 * <p>Every scenario asserts twice: what the form says once the event is reopened, and what
 * CalDAV holds. A drag that only repaints the grid is a regression waiting to be noticed by a
 * user on their next reload, and the grid alone would not catch it.
 *
 * <p>Positions are expressed as translations of the card, never as absolute drop points: the
 * grid scrolls, its slot height depends on the viewport, and FullCalendar moves an event by the
 * distance the mouse travelled.
 */
class DragAndDropTest extends TwakeCalendarE2ETest {

    private static final String SHANGHAI = "Asia/Shanghai";

    private static String uniqueTitle(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    private void awaitAttached(Locator locator) {
        locator.first().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.ATTACHED));
    }

    /** Creates a timed event of the day and returns once its card is in the grid. */
    private String anEventAt(CalendarPage calendar, String prefix, String from, String to) {
        String title = uniqueTitle(prefix);
        calendar.createEvent().title(title).expand().startTime(from).endTime(to).save();
        awaitAttached(calendar.eventCard(title));
        return title;
    }

    /**
     * The start the form shows for an event, closing the form afterwards so the next assertion
     * starts from a clean screen. Cancel rather than the close cross: the edit form does not
     * always offer one, and a form left open swallows the following interaction.
     */
    private String startTimeOf(CalendarPage calendar, String title) {
        EventFormModal form = calendar.openEvent(title).edit().expand();
        String start = form.startTime();
        form.cancel();
        return start;
    }

    private String endTimeOf(CalendarPage calendar, String title) {
        EventFormModal form = calendar.openEvent(title).edit().expand();
        String end = form.endTime();
        form.cancel();
        return end;
    }

    /** The DTSTART of the one event of the user, as written on the wire. */
    private String dtStart(CalendarProbe probe, E2EUser user) {
        return Ics.property(Ics.event(probe.singleEvent(user)), "DTSTART").orElseThrow();
    }

    @Test
    @DisplayName("DND-01 Dragging an event changes its time")
    void draggingAnEventChangesItsTime(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = anEventAt(calendar, "Dragged", "09:00", "10:00");

        calendar.dragEventToSlot(title, E2EClock.today(), "14:00:00");

        Awaitility.await().atMost(Duration.ofSeconds(20)).untilAsserted(() ->
            assertThat(startTimeOf(calendar, title)).isEqualTo("14:00"));
    }

    @Test
    @DisplayName("DND-02 The time reached by a drag is persisted in CalDAV")
    void theTimeReachedByADragIsPersisted(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = anEventAt(calendar, "Persisted drag", "09:00", "10:00");
        String before = dtStart(probe, user);

        calendar.dragEventToSlot(title, E2EClock.today(), "15:00:00");

        Awaitility.await().atMost(Duration.ofSeconds(20)).untilAsserted(() -> {
            assertThat(dtStart(probe, user)).isNotEqualTo(before);
            assertThat(startTimeOf(calendar, title)).isEqualTo("15:00");
        });
    }

    @Test
    @DisplayName("DND-03 Dragging an event to another column changes its date, not its time")
    void draggingToAnotherColumnChangesTheDate(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = anEventAt(calendar, "Another day", "09:00", "10:00");
        // any other column of the week on screen: plusDays would fall off the grid on its edge
        LocalDate destination = calendar.visibleDates().stream()
            .map(LocalDate::parse)
            .filter(date -> !date.equals(E2EClock.today()))
            .min(java.util.Comparator.comparingLong(
                date -> Math.abs(date.toEpochDay() - E2EClock.today().toEpochDay())))
            .orElseThrow();

        calendar.dragEventToDay(title, destination);

        Awaitility.await().atMost(Duration.ofSeconds(20)).untilAsserted(() -> {
            assertThat(dtStart(probe, user).replace("-", ""))
                .contains(destination.toString().replace("-", ""));
            assertThat(startTimeOf(calendar, title)).isEqualTo("09:00");
        });
    }

    @Test
    @DisplayName("DND-04 Resizing an event from the bottom lengthens it")
    void resizingFromTheBottomLengthensTheEvent(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = anEventAt(calendar, "Stretched", "09:00", "10:00");

        calendar.resizeEventEndTo(title, "12:00:00");

        Awaitility.await().atMost(Duration.ofSeconds(20)).untilAsserted(() -> {
            assertThat(endTimeOf(calendar, title)).isEqualTo("12:00");
            assertThat(startTimeOf(calendar, title)).isEqualTo("09:00");
        });
    }

    @Test
    @DisplayName("DND-06 Resizing an event onto its own start never gives it a zero duration")
    void resizingOntoTheStartNeverGivesAZeroDuration(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = anEventAt(calendar, "Squashed", "10:00", "11:00");

        calendar.tryResizeEventEndTo(title, "10:00:00");

        // Whatever the grid decided -- refuse the resize or clamp it to the smallest slot --
        // the event must never end before or when it starts.
        Awaitility.await().atMost(Duration.ofSeconds(20)).untilAsserted(() ->
            assertThat(endTimeOf(calendar, title)).isGreaterThan(startTimeOf(calendar, title)));
        String event = Ics.event(probe.singleEvent(user));
        assertThat(Ics.property(event, "DTEND").orElseThrow())
            .isNotEqualTo(Ics.property(event, "DTSTART").orElseThrow());
    }

    @Test
    @DisplayName("DND-07 Dragging an occurrence of a series asks what it applies to")
    void draggingAnOccurrenceAsksWhatItAppliesTo(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Daily standup");
        EventFormModal form = calendar.createEvent().title(title).expand()
            .startTime("09:00").endTime("09:30");
        form.repeat().frequency(RecurrenceSection.DAILY);
        form.save();
        awaitAttached(calendar.eventCard(title));

        calendar.dragEventToSlot(title, E2EClock.today(), "16:00:00");

        ScopeDialog.waitFor(page).thisEvent();
    }

    @Test
    @DisplayName("DND-08 Dragging one occurrence turns it into an exception of the series")
    void draggingOneOccurrenceCreatesAnException(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Weekly review");
        EventFormModal form = calendar.createEvent().title(title).expand()
            .startTime("09:00").endTime("10:00");
        form.repeat().frequency(RecurrenceSection.DAILY);
        form.save();
        awaitAttached(calendar.eventCard(title));

        calendar.dragEventToSlot(title, E2EClock.today(), "17:00:00");
        ScopeDialog.waitFor(page).thisEvent();

        Awaitility.await().atMost(Duration.ofSeconds(20)).untilAsserted(() -> {
            String raw = probe.singleEvent(user);
            assertThat(Ics.overrides(raw)).hasSize(1);
            assertThat(Ics.property(Ics.master(raw), "RRULE")).isPresent();
        });
    }

    @Test
    @DisplayName("DND-11 An event the user was only invited to cannot be dragged")
    void anInvitationCannotBeDragged(Page page, E2EUser user, E2EUserFactory users,
                                     E2ESessions sessions, CalendarProbe probe) {
        // the invitee has to exist on the backend before the invitation is sent their way
        CalendarPage calendar = LoginPage.loginAs(page, user);
        E2EUser organiser = users.newUser("organiser");
        CalendarPage organiserCalendar = sessions.openFor(organiser);
        String title = uniqueTitle("Invited only");
        organiserCalendar.createEvent().title(title)
            .addGuest(user.email())
            .expand().startTime("09:00").endTime("10:00")
            .save();

        page.reload();
        calendar.waitUntilLoaded();
        calendar.eventCard(title).first().waitFor(new Locator.WaitForOptions()
            .setState(WaitForSelectorState.ATTACHED).setTimeout(60_000));
        String before = Awaitility.await().atMost(Duration.ofSeconds(30))
            .until(() -> dtStart(probe, user), java.util.Objects::nonNull);

        boolean moved = calendar.tryDragEventToSlot(title, E2EClock.today(), "18:00:00");

        assertThat(moved)
            .as("an event the user was only invited to is not theirs to move")
            .isFalse();
        assertThat(dtStart(probe, user)).isEqualTo(before);
    }

    @Test
    @DisplayName("DND-12 A drag by the organiser reaches the copy of the guest")
    void aDragReachesTheGuestCopy(Page page, E2EUser user, E2EUserFactory users,
                                  E2ESessions sessions, CalendarProbe probe) {
        E2EUser guest = users.newUser("guest");
        // the account only exists on the backend once it has signed in once
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Moved for everyone");
        calendar.createEvent().title(title)
            .addGuest(guest.email())
            .expand().startTime("09:00").endTime("10:00")
            .save();
        awaitAttached(calendar.eventCard(title));
        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(probe.eventSummaries(guest)).contains(title));
        String guestBefore = dtStart(probe, guest);

        calendar.dragEventToSlot(title, E2EClock.today(), "13:00:00");

        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(dtStart(probe, guest)).isNotEqualTo(guestBefore));
    }

    @Test
    @DisplayName("DND-13 A drag the server refuses does not leave the event moved")
    void aRefusedDragDoesNotLeaveTheEventMoved(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = anEventAt(calendar, "Refused move", "09:00", "10:00");
        String before = dtStart(probe, user);

        // Refuse every write towards a calendar, whatever verb carries it: a move does not
        // necessarily travel as a PUT, and letting the real one through would have the event
        // move for good while the test believes it was refused.
        page.route("**/*", route -> {
            String method = route.request().method();
            boolean write = "PUT".equals(method) || "POST".equals(method)
                || "PATCH".equals(method) || "DELETE".equals(method);
            if (write && route.request().url().contains("calendars")) {
                route.fulfill(new com.microsoft.playwright.Route.FulfillOptions()
                    .setStatus(500).setBody("nope"));
            } else {
                route.resume();
            }
        });
        boolean moved = calendar.tryDragEventToSlot(title, E2EClock.today(), "19:00:00");
        page.unrouteAll();

        assertThat(moved)
            .as("a move the server refused must not be left on screen")
            .isFalse();

        assertThat(dtStart(probe, user)).isEqualTo(before);
        page.reload();
        calendar.waitUntilLoaded();
        assertThat(startTimeOf(calendar, title)).isEqualTo("09:00");
    }

    @Test
    @DisplayName("DND-14 Dragging in the month view changes the date and keeps the time")
    void draggingInTheMonthViewKeepsTheTime(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = anEventAt(calendar, "Month move", "09:00", "10:00");
        // a day of the current week: the month grid always holds it whole, and the week view the
        // test goes back to at the end shows it too
        LocalDate destination = calendar.anotherDayOfTheWeekOnScreen();
        calendar.switchView("Month");
        awaitAttached(calendar.eventCard(title));

        calendar.dragMonthEventToDay(title, destination);

        Awaitility.await().atMost(Duration.ofSeconds(20)).untilAsserted(() ->
            assertThat(dtStart(probe, user)).contains(destination.toString().replace("-", "")));
        calendar.switchView("Week");
        assertThat(startTimeOf(calendar, title)).isEqualTo("09:00");
    }

    @Test
    @DisplayName("DND-16 A dragged event is still where it was dropped after a reload")
    void aDraggedEventSurvivesAReload(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = anEventAt(calendar, "Reloaded", "09:00", "10:00");

        calendar.dragEventToSlot(title, E2EClock.today(), "16:00:00");
        Awaitility.await().atMost(Duration.ofSeconds(20)).untilAsserted(() ->
            assertThat(startTimeOf(calendar, title)).isEqualTo("16:00"));

        page.reload();
        calendar.waitUntilLoaded();

        PlaywrightAssertions.assertThat(calendar.eventCard(title).first()).isAttached();
        assertThat(startTimeOf(calendar, title)).isEqualTo("16:00");
    }

    /** Puts the grid eight hours ahead of UTC, while the browser of the suite sits in Paris. */
    private CalendarPage inShanghai(CalendarPage calendar) {
        return calendar.openSettings().selectTimezone(SHANGHAI).backToCalendar();
    }

    @Test
    @DisplayName("DND-17 A drag lands on the aimed slot when the grid is in another zone than the browser")
    void aDragInAnotherZoneLandsOnTheAimedSlot(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = inShanghai(LoginPage.loginAs(page, user));
        String title = anEventAt(calendar, "Shanghai drag", "09:00", "10:00");

        calendar.dragEventToSlot(title, E2EClock.today(ZoneId.of(SHANGHAI)), "14:00:00");

        // the dropped time used to be read back in the zone of the browser, six hours later
        Awaitility.await().atMost(Duration.ofSeconds(20)).untilAsserted(() -> {
            assertThat(Ics.parameters(Ics.event(probe.singleEvent(user)), "DTSTART"))
                .contains("TZID=" + SHANGHAI);
            assertThat(dtStart(probe, user)).endsWith("T140000");
            assertThat(startTimeOf(calendar, title)).isEqualTo("14:00");
        });
    }

    @Test
    @DisplayName("DND-18 A resize reaches the aimed end when the grid is in another zone than the browser")
    void aResizeInAnotherZoneReachesTheAimedEnd(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = inShanghai(LoginPage.loginAs(page, user));
        String title = anEventAt(calendar, "Shanghai resize", "09:00", "10:00");

        calendar.resizeEventEndTo(title, "12:00:00");

        Awaitility.await().atMost(Duration.ofSeconds(20)).untilAsserted(() -> {
            String event = Ics.event(probe.singleEvent(user));
            assertThat(Ics.parameters(event, "DTSTART")).contains("TZID=" + SHANGHAI);
            assertThat(Ics.parameters(event, "DTEND")).contains("TZID=" + SHANGHAI);
            assertThat(Ics.property(event, "DTSTART").orElseThrow()).endsWith("T090000");
            assertThat(Ics.property(event, "DTEND").orElseThrow()).endsWith("T120000");
            assertThat(endTimeOf(calendar, title)).isEqualTo("12:00");
            assertThat(startTimeOf(calendar, title)).isEqualTo("09:00");
        });
    }
}
