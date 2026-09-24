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
import com.linagora.calendar.e2e.docker.E2ESessions;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.linagora.calendar.e2e.pages.PublicBookingPage;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.PlaywrightAssertions;

/**
 * The public application, played as a visitor with no account.
 *
 * <p>The owner publishes a schedule in one browser context, and everything else happens in a
 * second one that never logged in: same origin separation as reality, and a leak of the owner's
 * session into the public page could not go unnoticed.
 */
class PublicBookingTest extends TwakeCalendarE2ETest {

    private static String uniqueName(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    private static LocalDate nextWeekSameDay() {
        return LocalDate.now().plusDays(7);
    }

    private static String dayCode(LocalDate day) {
        return day.getDayOfWeek().name().substring(0, 3);
    }

    /** Publishes a schedule open on one day only, and returns its public identifier. */
    private String publish(CalendarPage owner, String name, LocalDate day, String from, String to) {
        owner.createBookingLink().name(name).onlyAvailableOn(dayCode(day), from, to).save();
        PlaywrightAssertions.assertThat(owner.bookingLinkChip(name).first()).isVisible();
        return owner.bookingLinkPublicId(name);
    }

    /** Same, for a schedule whose bookings make the owner busy rather than free. */
    private String publishBusy(CalendarPage owner, String name, LocalDate day,
                               String from, String to) {
        owner.createBookingLink().name(name)
            .onlyAvailableOn(dayCode(day), from, to)
            .moreOptions()
            .showMeAs("Busy")
            .save();
        PlaywrightAssertions.assertThat(owner.bookingLinkChip(name).first()).isVisible();
        return owner.bookingLinkPublicId(name);
    }

    @Test
    @DisplayName("PUB-01 A booking page loads for a visitor who never logged in")
    void aBookingPageLoadsWithoutAuthentication(Page page, E2EUser user, E2ESessions sessions) {
        CalendarPage owner = LoginPage.loginAs(page, user);
        LocalDate day = nextWeekSameDay();
        String name = uniqueName("Open to all");
        String publicId = publish(owner, name, day, "09:00", "12:00");

        Page visitor = sessions.blankPage();
        PublicBookingPage booking = PublicBookingPage.open(visitor, publicId);

        assertThat(booking.text()).contains(name);
        assertThat(visitor.evaluate("() => Object.keys(sessionStorage).length"))
            .as("the public page must not carry any session")
            .isEqualTo(0);
    }

    @Test
    @DisplayName("PUB-02 Only the days the schedule covers are offered")
    void onlyTheDaysOfTheScheduleAreOffered(Page page, E2EUser user, E2ESessions sessions) {
        CalendarPage owner = LoginPage.loginAs(page, user);
        LocalDate day = nextWeekSameDay();
        String publicId = publish(owner, uniqueName("One day"), day, "09:00", "12:00");

        Page visitor = sessions.blankPage();
        PublicBookingPage booking = PublicBookingPage.open(visitor, publicId);

        // availability loads asynchronously: a strict assert races the picker hydration
        Awaitility.await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(booking.isBookable(day)).isTrue());
        assertThat(booking.isBookable(day.plusDays(1)))
            .as("a day the schedule does not cover must not be selectable")
            .isFalse();
    }

    @Test
    @DisplayName("PUB-03 Selecting a day shows the slots of that day")
    void selectingADayShowsItsSlots(Page page, E2EUser user, E2ESessions sessions) {
        CalendarPage owner = LoginPage.loginAs(page, user);
        LocalDate day = nextWeekSameDay();
        String publicId = publish(owner, uniqueName("Morning"), day, "09:00", "11:00");

        Page visitor = sessions.blankPage();
        List<String> slots = PublicBookingPage.open(visitor, publicId).selectDay(day).slots();

        assertThat(slots)
            .as("a two hour window at half hour steps, the last one starting at 10:30")
            .containsExactly("09:00", "09:30", "10:00", "10:30");
    }

    @Test
    @DisplayName("PUB-05 An unknown link tells the visitor so")
    void anUnknownLinkTellsTheVisitor(Page page, E2EUser user, E2ESessions sessions) {
        Page visitor = sessions.blankPage();

        PublicBookingPage booking = PublicBookingPage.open(visitor, UUID.randomUUID().toString());

        assertThat(booking.text()).containsIgnoringCase("not");
        assertThat(booking.text()).doesNotContain("Confirm");
    }

    @Test
    @DisplayName("PUB-06 A retired link is no longer bookable")
    void aRetiredLinkIsNoLongerBookable(Page page, E2EUser user, E2ESessions sessions) {
        CalendarPage owner = LoginPage.loginAs(page, user);
        LocalDate day = nextWeekSameDay();
        String name = uniqueName("Retired");
        String publicId = publish(owner, name, day, "09:00", "12:00");

        owner.editBookingLink(name).deactivate().save();

        Page visitor = sessions.blankPage();
        PublicBookingPage booking = PublicBookingPage.open(visitor, publicId);
        assertThat(booking.text()).contains("This booking link is not available");
    }

    @Test
    @DisplayName("PUB-07 A booking without a name is refused")
    void aBookingWithoutANameIsRefused(Page page, E2EUser user, E2ESessions sessions,
                                       CalendarProbe probe) {
        CalendarPage owner = LoginPage.loginAs(page, user);
        LocalDate day = nextWeekSameDay();
        String publicId = publish(owner, uniqueName("Named visitors"), day, "09:00", "11:00");

        Page visitor = sessions.blankPage();
        PublicBookingPage booking = PublicBookingPage.open(visitor, publicId)
            .selectDay(day).pickSlot("09:00")
            .fillVisitor("", "anonymous@open-paas.org")
            .confirm();

        visitor.waitForTimeout(3000);
        assertThat(booking.isConfirmed()).isFalse();
        assertThat(probe.rawEvents(user)).isEmpty();
    }

    @Test
    @DisplayName("PUB-08 A booking without an email is refused")
    void aBookingWithoutAnEmailIsRefused(Page page, E2EUser user, E2ESessions sessions,
                                         CalendarProbe probe) {
        CalendarPage owner = LoginPage.loginAs(page, user);
        LocalDate day = nextWeekSameDay();
        String publicId = publish(owner, uniqueName("Reachable visitors"), day, "09:00", "11:00");

        Page visitor = sessions.blankPage();
        PublicBookingPage booking = PublicBookingPage.open(visitor, publicId)
            .selectDay(day).pickSlot("09:00")
            .fillVisitor("No Mail", "")
            .confirm();

        visitor.waitForTimeout(3000);
        assertThat(booking.isConfirmed()).isFalse();
        assertThat(probe.rawEvents(user)).isEmpty();
    }

    @Test
    @DisplayName("PUB-09 An address that is not one is refused")
    void anInvalidEmailIsRefused(Page page, E2EUser user, E2ESessions sessions,
                                 CalendarProbe probe) {
        CalendarPage owner = LoginPage.loginAs(page, user);
        LocalDate day = nextWeekSameDay();
        String publicId = publish(owner, uniqueName("Valid mail only"), day, "09:00", "11:00");

        Page visitor = sessions.blankPage();
        PublicBookingPage booking = PublicBookingPage.open(visitor, publicId)
            .selectDay(day).pickSlot("09:00")
            .fillVisitor("Typo Prone", "not-an-address")
            .confirm();

        visitor.waitForTimeout(3000);
        assertThat(booking.isConfirmed()).isFalse();
        assertThat(probe.rawEvents(user)).isEmpty();
    }

    @Test
    @DisplayName("PUB-10 Confirming shows the visitor when the meeting is")
    void confirmingShowsWhenTheMeetingIs(Page page, E2EUser user, E2ESessions sessions) {
        CalendarPage owner = LoginPage.loginAs(page, user);
        LocalDate day = nextWeekSameDay();
        String publicId = publish(owner, uniqueName("Confirmable"), day, "14:00", "16:00");

        Page visitor = sessions.blankPage();
        String confirmation = PublicBookingPage.open(visitor, publicId)
            .selectDay(day).pickSlot("14:00")
            .bookAs("Sam Visitor", "sam.visitor@open-paas.org")
            .successMessage();

        assertThat(confirmation).contains("Meeting created");
        assertThat(confirmation).contains("14:00");
        assertThat(confirmation).contains(String.valueOf(day.getDayOfMonth()));
    }

    @Test
    @DisplayName("PUB-11 A slot taken in the meantime stops being offered")
    void aSlotTakenInTheMeantimeStopsBeingOffered(Page page, E2EUser user, E2ESessions sessions) {
        CalendarPage owner = LoginPage.loginAs(page, user);
        LocalDate day = nextWeekSameDay();
        String publicId = publishBusy(owner, uniqueName("First come"), day, "09:00", "11:00");

        Page first = sessions.blankPage();
        PublicBookingPage.open(first, publicId).selectDay(day).pickSlot("09:00")
            .bookAs("Early Bird", "early.bird@open-paas.org")
            .successMessage();

        Page second = sessions.blankPage();
        Awaitility.await().atMost(Duration.ofSeconds(60)).untilAsserted(() -> {
            PublicBookingPage retry = PublicBookingPage.open(second, publicId).selectDay(day);
            assertThat(retry.slots())
                .as("the slot somebody just took must be gone")
                .doesNotContain("09:00")
                .contains("09:30");
        });
    }

    @Test
    @DisplayName("PUB-12 The visitor can cancel the meeting they booked")
    void theVisitorCanCancelTheirMeeting(Page page, E2EUser user, E2ESessions sessions,
                                         CalendarProbe probe) {
        CalendarPage owner = LoginPage.loginAs(page, user);
        LocalDate day = nextWeekSameDay();
        String publicId = publish(owner, uniqueName("Cancellable"), day, "09:00", "11:00");

        Page visitor = sessions.blankPage();
        PublicBookingPage booking = PublicBookingPage.open(visitor, publicId)
            .selectDay(day).pickSlot("09:00")
            .bookAs("Fickle Visitor", "fickle.visitor@open-paas.org");
        booking.successMessage();
        Awaitility.await().atMost(Duration.ofSeconds(60)).untilAsserted(() ->
            assertThat(probe.rawEvents(user)).isNotEmpty());

        booking.cancelBooking();

        assertThat(booking.text()).contains("Reservation cancelled");
        // the meeting is not deleted, it is cancelled: the owner keeps a trace of what was booked
        Awaitility.await().atMost(Duration.ofSeconds(60)).untilAsserted(() ->
            assertThat(probe.singleEvent(user))
                .as("the owner's copy must carry the cancellation")
                .contains("STATUS:CANCELLED"));
    }

    @Test
    @DisplayName("PUB-13 A cancelled slot is offered again")
    void aCancelledSlotIsOfferedAgain(Page page, E2EUser user, E2ESessions sessions,
                                      CalendarProbe probe) {
        CalendarPage owner = LoginPage.loginAs(page, user);
        LocalDate day = nextWeekSameDay();
        String publicId = publishBusy(owner, uniqueName("Freed again"), day, "09:00", "11:00");

        Page visitor = sessions.blankPage();
        PublicBookingPage booking = PublicBookingPage.open(visitor, publicId)
            .selectDay(day).pickSlot("09:00")
            .bookAs("Changed Mind", "changed.mind@open-paas.org");
        booking.successMessage();
        Awaitility.await().atMost(Duration.ofSeconds(60)).untilAsserted(() -> {
            PublicBookingPage taken = PublicBookingPage.open(sessions.blankPage(), publicId)
                .selectDay(day);
            assertThat(taken.slots()).doesNotContain("09:00");
        });

        booking.cancelBooking();

        Awaitility.await().atMost(Duration.ofSeconds(60)).untilAsserted(() -> {
            PublicBookingPage freed = PublicBookingPage.open(sessions.blankPage(), publicId)
                .selectDay(day);
            assertThat(freed.slots())
                .as("giving a slot back must put it on offer again")
                .contains("09:00");
        });
    }

    @Test
    @DisplayName("PUB-23 The footer carries the privacy and terms links")
    void theFooterCarriesThePrivacyAndTermsLinks(Page page, E2EUser user, E2ESessions sessions) {
        CalendarPage owner = LoginPage.loginAs(page, user);
        LocalDate day = nextWeekSameDay();
        String publicId = publish(owner, uniqueName("With a footer"), day, "09:00", "11:00");

        Page visitor = sessions.blankPage();
        PublicBookingPage.open(visitor, publicId);

        assertThat(visitor.locator("a").allInnerTexts().toString())
            .containsIgnoringCase("Privacy")
            .containsIgnoringCase("Terms");
    }
}
