package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.CalendarProbe;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.backend.E2EUserFactory;
import com.linagora.calendar.e2e.backend.Ical;
import com.linagora.calendar.e2e.docker.E2ESessions;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.EventFormModal;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.microsoft.playwright.Page;

/**
 * The availability the form shows for the people invited to an event.
 *
 * <p>Two things shape every test here. Availability is only computed for attendees already on
 * the event, so an event is created and reopened rather than merely filled in. And the indicator
 * is deliberately silent for somebody who is free: it renders an icon for busy and for the two
 * flavours of unknown, and nothing at all otherwise.
 *
 * <p>The browser sits in Paris, so an event seeded at 09:00 UTC is at 11:00 on screen. The
 * fixtures below are written in UTC and the form in local time, on purpose: a bug that confuses
 * the two would otherwise pass unnoticed.
 */
class FreeBusyTest extends TwakeCalendarE2ETest {
    private static final String BUSY = "This person is busy";
    private static final String UNKNOWN = "Can't show this guest's calendar.";
    private static final String FREE = "";

    private static String unique(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    /**
     * Somebody with an event already in their calendar at the given UTC hour of a given day.
     *
     * <p>The day is passed in rather than taken from the clock: the seed and the event under
     * test have to be on the same one, and a suite that runs for a quarter of an hour can put
     * midnight between the two.
     */
    private E2EUser somebodyBusyAt(E2EUserFactory users, E2ESessions sessions, CalendarProbe probe,
                                   LocalDate day, int utcHour) {
        E2EUser busy = users.newUser("busy");
        String uid = UUID.randomUUID().toString();
        probe.putEvent(busy, uid, Ical.event(uid, "Already taken", day, utcHour));
        return busy;
    }

    private E2EUser somebodyFree(E2EUserFactory users, E2ESessions sessions) {
        E2EUser free = users.newUser("free");
        return free;
    }

    /** Creates an event with those guests and reopens it, which is when availability is computed. */
    private EventFormModal anEventWith(CalendarPage calendar, LocalDate day, String from,
                                       String to, String... guests) {
        String title = unique("Availability");
        EventFormModal form = calendar.createEvent().title(title);
        for (String guest : guests) {
            form.addGuest(guest);
        }
        form.expand().at(day, from, to);
        // Availability is computed for the hour the event is at, so a time fill that did not
        // take would send every assertion here looking at the wrong hour and report a guest as
        // free. Check it landed before saving, rather than debug it afterwards.
        assertThat(form.startTime())
            .as("the event has to be at the hour the test meant to put it at")
            .isEqualTo(from);
        form.save();
        calendar.eventCard(title).first().waitFor();
        return calendar.openEvent(title).edit().expand();
    }

    @Test
    @DisplayName("FB-01 The form says something about every guest it carries")
    void theFormSaysSomethingAboutEveryGuest(Page page, E2EUser user, E2EUserFactory users,
                                             E2ESessions sessions, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate day = calendar.browserToday();
        E2EUser busy = somebodyBusyAt(users, sessions, probe, day, 9);

        EventFormModal form = anEventWith(calendar, day, "11:00", "12:00", busy.email());

        form.awaitAvailabilityOf(busy.email(), BUSY, "a guest already taken has to be flagged");
        assertThat(form.hasGuest(busy.email())).isTrue();
        form.cancel();
    }

    @Test
    @DisplayName("FB-02 A guest taken at that hour is flagged busy")
    void aGuestTakenAtThatHourIsFlaggedBusy(Page page, E2EUser user, E2EUserFactory users,
                                            E2ESessions sessions, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate day = calendar.browserToday();
        E2EUser busy = somebodyBusyAt(users, sessions, probe, day, 9);

        EventFormModal form = anEventWith(calendar, day, "11:00", "12:00", busy.email());

        form.awaitAvailabilityOf(busy.email(), BUSY,
            "somebody with an event at that hour is not available for another");
        form.cancel();
    }

    @Test
    @DisplayName("FB-07 Moving the event to a free hour clears the warning")
    void movingTheEventToAFreeHourClearsTheWarning(Page page, E2EUser user, E2EUserFactory users,
                                                   E2ESessions sessions, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate day = calendar.browserToday();
        E2EUser busy = somebodyBusyAt(users, sessions, probe, day, 9);
        EventFormModal form = anEventWith(calendar, day, "11:00", "12:00", busy.email());
        form.awaitAvailabilityOf(busy.email(), BUSY, "the guest is taken at eleven");

        form.startTime("16:00").endTime("17:00");

        form.awaitAvailabilityOf(busy.email(), FREE,
            "an hour nobody is taken at leaves nothing to warn about");
        form.cancel();
    }

    @Test
    @DisplayName("FB-11 Somebody outside the instance has no calendar to show")
    void somebodyOutsideTheInstanceHasNoCalendarToShow(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate day = calendar.browserToday();

        EventFormModal form = anEventWith(calendar, day, "11:00", "12:00", "outsider1@external.test");

        form.awaitAvailabilityOf("outsider1@external.test", UNKNOWN,
            "there is no calendar to consult for somebody outside the instance");
        form.cancel();
    }

    @Test
    @DisplayName("FB-08 An event its owner marked Free leaves them available")
    void anEventMarkedFreeLeavesThemAvailable(Page page, E2EUser user, E2EUserFactory users,
                                              E2ESessions sessions) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate day = calendar.browserToday();
        E2EUser mate = somebodyFree(users, sessions);
        CalendarPage mateCalendar = sessions.openFor(mate);
        String own = unique("Not really busy");
        mateCalendar.createEvent().title(own).expand()
            .at(day, "11:00", "12:00")
            .showMeAs("Free").save();
        mateCalendar.eventCard(own).first().waitFor();
        EventFormModal form = anEventWith(calendar, day, "11:00", "12:00", mate.email());

        form.awaitAvailabilityOf(mate.email(), FREE,
            "an event its owner marked Free does not make them unavailable");
        form.cancel();
    }

    @Test
    @DisplayName("FB-09 An event its owner marked Busy makes them unavailable")
    void anEventMarkedBusyMakesThemUnavailable(Page page, E2EUser user, E2EUserFactory users,
                                               E2ESessions sessions) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate day = calendar.browserToday();
        E2EUser mate = somebodyFree(users, sessions);
        CalendarPage mateCalendar = sessions.openFor(mate);
        String own = unique("Genuinely busy");
        mateCalendar.createEvent().title(own).expand()
            .at(day, "11:00", "12:00")
            .showMeAs("Busy").save();
        mateCalendar.eventCard(own).first().waitFor();
        EventFormModal form = anEventWith(calendar, day, "11:00", "12:00", mate.email());

        form.awaitAvailabilityOf(mate.email(), BUSY,
            "an event its owner marked Busy takes their time");
        form.cancel();
    }

    @Test
    @DisplayName("FB-12 An occurrence of a series makes its guest busy like any event")
    void anOccurrenceOfASeriesMakesItsGuestBusy(Page page, E2EUser user, E2EUserFactory users,
                                                E2ESessions sessions) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate day = calendar.browserToday();
        E2EUser mate = somebodyFree(users, sessions);
        CalendarPage mateCalendar = sessions.openFor(mate);
        String series = unique("Daily busy");
        EventFormModal own = mateCalendar.createEvent().title(series).expand()
            .at(day, "11:00", "12:00");
        own.repeat().frequency(com.linagora.calendar.e2e.pages.RecurrenceSection.DAILY)
            .endsAfter(5);
        own.save();
        mateCalendar.eventCard(series).first().waitFor();
        // tomorrow, an occurrence rather than the first instance of the series. Both ends move:
        // a start past its own end is not a range anything could be computed against.
        EventFormModal form = anEventWith(calendar, day, "11:00", "12:00", mate.email());
        form.startDate(day.plusDays(1));
        form.endDate(day.plusDays(1));

        form.awaitAvailabilityOf(mate.email(), BUSY,
            "every occurrence of a series takes its owner's time, not only the first");
        form.cancel();
    }

    @Test
    @DisplayName("FB-14 Taking a guest off the event takes their availability with them")
    void takingAGuestOffTakesTheirAvailability(Page page, E2EUser user, E2EUserFactory users,
                                               E2ESessions sessions, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate day = calendar.browserToday();
        E2EUser busy = somebodyBusyAt(users, sessions, probe, day, 9);
        EventFormModal form = anEventWith(calendar, day, "11:00", "12:00", busy.email());
        form.awaitAvailabilityOf(busy.email(), BUSY, "the guest starts out flagged busy");

        form.removeGuest(busy.email());

        assertThat(form.hasGuest(busy.email()))
            .as("a guest taken off leaves no trace of themselves in the form")
            .isFalse();
        form.cancel();
    }
}
