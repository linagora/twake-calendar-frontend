package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.LocalDate;
import java.util.UUID;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.CalendarProbe;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.backend.Ics;
import com.linagora.calendar.e2e.docker.E2EClock;
import com.linagora.calendar.e2e.docker.RuntimeConfig;
import com.linagora.calendar.e2e.pages.AppointmentModal;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.linagora.calendar.e2e.pages.PublicBookingPage;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.PlaywrightAssertions;

/**
 * Booking links seen from the side of the person who publishes one.
 *
 * <p>A booking link is the one feature of the product that hands a stranger a way to write into
 * a user's calendar, so the assertions go all the way to CalDAV rather than stopping at the
 * sidebar: what matters is the event that ends up in the owner's calendar.
 */
class BookingLinksTest extends TwakeCalendarE2ETest {

    private static String uniqueName(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    /** A weekday far enough ahead that no slot of it has gone past. */
    private static LocalDate nextWeekSameDay() {
        // the slots are computed by the backend, on the real clock: ahead on both
        return E2EClock.daysAheadOnBothClocks(7);
    }

    private static String dayCode(LocalDate day) {
        return day.getDayOfWeek().name().substring(0, 3);
    }

    /** Publishes a schedule bookable only on one day, and returns its public identifier. */
    private String aScheduleOn(CalendarPage calendar, String name, LocalDate day,
                               String from, String to) {
        calendar.createBookingLink()
            .name(name)
            .onlyAvailableOn(dayCode(day), from, to)
            .save();
        PlaywrightAssertions.assertThat(calendar.bookingLinkChip(name).first()).isVisible();
        return calendar.bookingLinkPublicId(name);
    }

    @Test
    @DisplayName("BOOK-01 The Booking links section is hidden when the feature is off")
    void theSectionIsHiddenWhenTheFeatureIsOff(Page page, E2EUser user, RuntimeConfig config) {
        config.set("BOOKING_LINK_ENABLED", "false");
        CalendarPage calendar = LoginPage.loginAs(page, user);

        assertThat(page.getByText("Booking links").count())
            .as("nothing of the feature must show when it is switched off")
            .isZero();
        assertThat(page.getByLabel("Create appointment schedule").count()).isZero();
    }

    @Test
    @DisplayName("BOOK-02 Creating a booking link adds it to the sidebar")
    void creatingABookingLinkAddsItToTheSidebar(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String name = uniqueName("Office hours");

        calendar.createBookingLink().name(name).save();

        PlaywrightAssertions.assertThat(calendar.bookingLinkChip(name).first()).isVisible();
        assertThat(calendar.bookingLinksJson()).contains(name);
    }

    @Test
    @DisplayName("BOOK-04 The slot duration offers the five documented lengths")
    void theDurationOffersTheFiveLengths(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        AppointmentModal modal = calendar.createBookingLink().name(uniqueName("Durations"));

        assertThat(modal.durationOptions())
            .containsExactly("15 minutes", "30 minutes", "45 minutes", "1 hour", "2 hours");
    }

    @Test
    @DisplayName("BOOK-05 Regular hours are set day by day")
    void regularHoursAreSetDayByDay(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String name = uniqueName("Mornings only");

        calendar.createBookingLink().name(name)
            .availableOn("MON", "08:00", "12:00")
            .availableOn("TUE", "14:00", "18:00")
            .save();

        String links = calendar.bookingLinksJson();
        assertThat(links).contains("\"dayOfWeek\":\"MON\",\"start\":\"08:00\",\"end\":\"12:00\"");
        assertThat(links).contains("\"dayOfWeek\":\"TUE\",\"start\":\"14:00\",\"end\":\"18:00\"");
    }

    @Test
    @DisplayName("BOOK-06 Copy to all replicates the hours of a day onto the others")
    void copyToAllReplicatesTheHours(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        AppointmentModal modal = calendar.createBookingLink().name(uniqueName("Same every day"))
            .availableOn("MON", "10:00", "16:00");

        modal.copyToAllDays("MON");

        assertThat(modal.startTimeOn("WED")).isEqualTo("10:00");
        assertThat(modal.endTimeOn("WED")).isEqualTo("16:00");
        assertThat(modal.startTimeOn("SUN")).isEqualTo("10:00");
    }

    @Test
    @DisplayName("BOOK-07 A day switched off is not published as available")
    void aDaySwitchedOffIsNotPublished(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String name = uniqueName("No mondays");

        calendar.createBookingLink().name(name).unavailableOn("MON").save();

        assertThat(calendar.bookingLinksJson())
            .doesNotContain("\"dayOfWeek\":\"MON\"");
    }

    @Test
    @DisplayName("BOOK-08 A second slot can be added to a day and removed again")
    void aSecondSlotCanBeAddedAndRemoved(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        AppointmentModal modal = calendar.createBookingLink().name(uniqueName("Two slots"))
            .availableOn("MON", "09:00", "12:00");

        modal.addSlotOn("MON");

        PlaywrightAssertions.assertThat(page.getByTestId("start-time-MON-1")).isVisible();
        page.getByLabel("remove-slot").first().click();
        PlaywrightAssertions.assertThat(page.getByTestId("start-time-MON-1")).hasCount(0);
    }

    @Test
    @DisplayName("BOOK-10 A schedule can be retired and published again")
    void aScheduleCanBeRetiredAndPublishedAgain(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String name = uniqueName("Seasonal");
        calendar.createBookingLink().name(name).save();

        calendar.editBookingLink(name).deactivate().save();
        assertThat(calendar.bookingLinksJson()).contains("\"active\":false");

        calendar.editBookingLink(name).activate().save();
        assertThat(calendar.bookingLinksJson()).contains("\"active\":true");
    }

    @Test
    @DisplayName("BOOK-11 Copying the booking link puts its public URL in the clipboard")
    void copyingTheLinkPutsItsUrlInTheClipboard(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String name = uniqueName("Shared");
        calendar.createBookingLink().name(name).save();
        String publicId = calendar.bookingLinkPublicId(name);

        String copied = calendar.copyBookingLink(name);

        assertThat(copied).isEqualTo(PublicBookingPage.BASE_URL + "/booking/" + publicId);
    }

    @Test
    @DisplayName("BOOK-12 Editing a schedule is persisted")
    void editingAScheduleIsPersisted(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String name = uniqueName("Draft hours");
        calendar.createBookingLink().name(name).availableOn("WED", "09:00", "17:00").save();

        calendar.editBookingLink(name).availableOn("WED", "11:00", "15:00").save();

        assertThat(calendar.bookingLinksJson())
            .contains("\"dayOfWeek\":\"WED\",\"start\":\"11:00\",\"end\":\"15:00\"");
        page.reload();
        calendar.waitUntilLoaded();
        assertThat(calendar.editBookingLink(name).startTimeOn("WED")).isEqualTo("11:00");
    }

    @Test
    @DisplayName("BOOK-14 A slot already busy in the calendar is not offered")
    void aBusySlotIsNotOffered(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate day = nextWeekSameDay();
        String name = uniqueName("Around a meeting");
        String publicId = aScheduleOn(calendar, name, day, "09:00", "12:00");

        calendar.createEvent().title("Busy already").expand()
            .startDate(day).startTime("10:00").endTime("11:00").save();

        PublicBookingPage booking = PublicBookingPage.open(page, publicId).selectDay(day);
        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() -> {
            page.reload();
            new PublicBookingPage(page).waitUntilLoaded().selectDay(day);
            assertThat(new PublicBookingPage(page).slots())
                .as("the slots covered by an existing event must not be on offer")
                .doesNotContain("10:00", "10:30")
                .contains("09:00");
        });
    }

    @Test
    @DisplayName("BOOK-15 A confirmed booking lands in the calendar of the owner")
    void aConfirmedBookingLandsInTheOwnerCalendar(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate day = nextWeekSameDay();
        String name = uniqueName("Bookable");
        String publicId = aScheduleOn(calendar, name, day, "09:00", "11:00");

        PublicBookingPage.open(page, publicId)
            .selectDay(day)
            .pickSlot("09:00")
            .bookAs("Alex Visitor", "alex.visitor@open-paas.org")
            .successMessage();

        Awaitility.await().atMost(Duration.ofSeconds(60)).untilAsserted(() ->
            assertThat(probe.rawEvents(user)).isNotEmpty());
        String event = Ics.event(probe.singleEvent(user));
        assertThat(Ics.property(event, "DTSTART").orElseThrow())
            .contains(day.toString().replace("-", ""));
    }

    @Test
    @DisplayName("BOOK-16 The owner sees who booked the slot")
    void theOwnerSeesWhoBooked(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate day = nextWeekSameDay();
        String name = uniqueName("Who booked");
        String publicId = aScheduleOn(calendar, name, day, "13:00", "15:00");

        PublicBookingPage.open(page, publicId)
            .selectDay(day)
            .pickSlot("13:00")
            .bookAs("Robin Guest", "robin.guest@open-paas.org")
            .successMessage();

        Awaitility.await().atMost(Duration.ofSeconds(60)).untilAsserted(() -> {
            assertThat(probe.rawEvents(user)).isNotEmpty();
            String event = Ics.event(probe.singleEvent(user));
            assertThat(Ics.properties(event, "ATTENDEE").toString())
                .contains("robin.guest@open-paas.org");
        });
    }

    @Test
    @DisplayName("BOOK-21 Two schedules coexist, each with its own hours")
    void twoSchedulesCoexist(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String morning = uniqueName("Mornings");
        String afternoon = uniqueName("Afternoons");

        calendar.createBookingLink().name(morning).onlyAvailableOn("MON", "08:00", "12:00").save();
        calendar.createBookingLink().name(afternoon).onlyAvailableOn("MON", "14:00", "18:00").save();

        PlaywrightAssertions.assertThat(calendar.bookingLinkChip(morning).first()).isVisible();
        PlaywrightAssertions.assertThat(calendar.bookingLinkChip(afternoon).first()).isVisible();
        assertThat(calendar.bookingLinkPublicId(morning))
            .isNotEqualTo(calendar.bookingLinkPublicId(afternoon));
    }

    @Test
    @DisplayName("BOOK-22 A booked slot comes with its video conference link")
    void aBookedSlotComesWithItsVideoConference(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate day = nextWeekSameDay();
        String name = uniqueName("With visio");
        String publicId = aScheduleOn(calendar, name, day, "10:00", "12:00");

        String confirmation = PublicBookingPage.open(page, publicId)
            .selectDay(day)
            .pickSlot("10:00")
            .bookAs("Camille Visitor", "camille.visitor@open-paas.org")
            .successMessage();

        assertThat(confirmation).contains("Join the video conference");
        Awaitility.await().atMost(Duration.ofSeconds(60)).untilAsserted(() -> {
            assertThat(probe.rawEvents(user)).isNotEmpty();
            assertThat(probe.singleEvent(user))
                .as("the conference link belongs in the event, not only on the confirmation screen")
                .containsIgnoringCase("meet");
        });
    }
}
