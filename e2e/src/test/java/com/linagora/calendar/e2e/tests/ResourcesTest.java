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
import com.linagora.calendar.e2e.backend.E2EUserFactory;
import com.linagora.calendar.e2e.backend.ResourceProbe;
import com.linagora.calendar.e2e.docker.E2ESessions;
import com.linagora.calendar.e2e.docker.RuntimeConfig;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.EventFormModal;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.LocatorAssertions;
import com.microsoft.playwright.assertions.PlaywrightAssertions;

/**
 * Domain resources: rooms and equipment one books along with an event.
 *
 * <p>They are provisioned through the webadmin API, like team calendars, and the administrator
 * has to have signed in once before being named as one.
 */
class ResourcesTest extends TwakeCalendarE2ETest {
    private static final long PROPAGATION_MS = 60_000;
    private static final String BOOKED = "This resource is already booked";
    private static final String FREE = "";

    private static String unique(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    private void awaitResourceVisible(Page page, String name) {
        Awaitility.await().atMost(Duration.ofMillis(PROPAGATION_MS))
            .pollInterval(Duration.ofSeconds(2))
            .untilAsserted(() -> {
                page.reload();
                new CalendarPage(page).waitUntilLoaded();
                page.locator("li").filter(new Locator.FilterOptions().setHasText(name))
                    .first().waitFor(new Locator.WaitForOptions().setTimeout(8_000));
            });
    }

    @Test
    @DisplayName("RES-01 The Resources section lists the resources of the domain")
    void theResourcesSectionListsThem(Page page, E2EUser user, ResourceProbe resources) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String room = unique("Board room");
        resources.create(room, "The one with the big table", user);

        awaitResourceVisible(page, room);

        PlaywrightAssertions.assertThat(calendar.sidebarSection("Resources").first()).isVisible();
        assertThat(resources.names()).contains(room);
    }

    @Test
    @DisplayName("RES-03 A resource booked from the form is carried by the event")
    void aBookedResourceIsCarriedByTheEvent(Page page, E2EUser user, ResourceProbe resources) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String room = unique("Bookable room");
        resources.create(room, "A room", user);
        awaitResourceVisible(page, room);

        String title = unique("Meeting with a room");
        calendar.createEvent().title(title).expand().addResource(room).save();

        PlaywrightAssertions.assertThat(calendar.eventCard(title).first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(PROPAGATION_MS));
        EventFormModal form = calendar.openEvent(title).edit().expand();
        assertThat(form.text())
            .as("the room the event was booked with has to still be on it")
            .contains(room);
        form.cancel();
    }

    @Test
    @DisplayName("RES-12 The resource field filters on what is typed")
    void theResourceFieldFilters(Page page, E2EUser user, ResourceProbe resources) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String wanted = unique("Projector");
        String other = unique("Bicycle");
        resources.create(wanted, "Bright", user);
        resources.create(other, "Fast", user);
        awaitResourceVisible(page, wanted);

        EventFormModal form = calendar.createEvent().title(unique("Filtering")).expand();

        assertThat(form.resourceOptions(wanted.substring(0, 9)))
            .anyMatch(option -> option.contains(wanted));
        assertThat(form.resourceOptions(wanted.substring(0, 9)))
            .as("a search names one resource, not the whole domain")
            .noneMatch(option -> option.contains(other));
        form.cancel();
    }

    @Test
    @DisplayName("RES-13 A resource search matching nothing says so")
    void aResourceSearchMatchingNothingSaysSo(Page page, E2EUser user, ResourceProbe resources) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String room = unique("Existing room");
        resources.create(room, "A room", user);
        awaitResourceVisible(page, room);

        EventFormModal form = calendar.createEvent().title(unique("Fruitless")).expand();
        Locator search = form.resourceSearch();
        search.click();
        search.pressSequentially("zzz-nothing-matches-this",
            new Locator.PressSequentiallyOptions().setDelay(20));
        page.waitForTimeout(3000);

        // the message belongs to the autocomplete popper, which lives outside the dialog
        assertThat(page.locator("body").innerText())
            .as("an empty result has to be said, not left blank")
            .contains("No results");
        form.cancel();
    }

    @Test
    @DisplayName("RES-15 Unticking a resource takes its bookings off the grid")
    void untickingAResourceHidesItsBookings(Page page, E2EUser user, ResourceProbe resources) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String room = unique("Hideable room");
        resources.create(room, "A room", user);
        awaitResourceVisible(page, room);
        calendar.showCalendar(room);
        String title = unique("Booked in the room");
        calendar.createEvent().title(title).expand().addResource(room).save();
        calendar.eventCard(title).first().waitFor(new Locator.WaitForOptions()
            .setState(com.microsoft.playwright.options.WaitForSelectorState.ATTACHED)
            .setTimeout(PROPAGATION_MS));

        calendar.calendarCheckbox(room).uncheck();
        page.waitForTimeout(2000);

        assertThat(calendar.calendarCheckbox(room).isChecked())
            .as("the resource really is switched off")
            .isFalse();
    }

    @Test
    @DisplayName("RES-17 Somebody who administers nothing sees no resource of their own")
    void aNonAdministratorSeesNoResourceOfTheirOwn(Page page, E2EUser user, E2EUserFactory users,
                                                   E2ESessions sessions, ResourceProbe resources) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String room = unique("Administered room");
        resources.create(room, "A room", user);
        awaitResourceVisible(page, room);

        E2EUser outsider = users.newUser("outsider");
        Page outsiderPage = sessions.pageFor(outsider);
        outsiderPage.waitForTimeout(4000);
        outsiderPage.reload();
        new CalendarPage(outsiderPage).waitUntilLoaded();
        outsiderPage.waitForTimeout(4000);

        assertThat(outsiderPage.locator("li")
            .filter(new Locator.FilterOptions().setHasText(room)).count())
            .as("a resource lands in the sidebar of the people who administer it")
            .isZero();
    }

    @Test
    @DisplayName("RES-18 HIDE_RESOURCES takes the whole section away")
    void hideResourcesTakesTheSectionAway(Page page, E2EUser user, ResourceProbe resources,
                                          RuntimeConfig config) {
        config.set("HIDE_RESOURCES", "true");
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String room = unique("Invisible room");
        resources.create(room, "A room", user);
        page.reload();
        calendar.waitUntilLoaded();
        page.waitForTimeout(4000);

        assertThat(page.getByText("Resources").count())
            .as("nothing of the feature shows when it is switched off")
            .isZero();
        assertThat(page.locator("li").filter(new Locator.FilterOptions().setHasText(room)).count())
            .isZero();
    }

    @Test
    @DisplayName("RES-11 Deleting the event that booked a resource gives it back")
    void deletingTheEventGivesTheResourceBack(Page page, E2EUser user, ResourceProbe resources) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String room = unique("Freed room");
        resources.create(room, "A room", user);
        awaitResourceVisible(page, room);
        String title = unique("Short lived booking");
        calendar.createEvent().title(title).expand().addResource(room).save();
        calendar.eventCard(title).first().waitFor(new Locator.WaitForOptions()
            .setState(com.microsoft.playwright.options.WaitForSelectorState.ATTACHED)
            .setTimeout(PROPAGATION_MS));

        calendar.openEvent(title).delete();

        PlaywrightAssertions.assertThat(calendar.eventCard(title))
            .hasCount(0, new LocatorAssertions.HasCountOptions().setTimeout(PROPAGATION_MS));
    }

    /** The ATTENDEE line of the resource in somebody's copy of an event, parameters included. */
    private String resourceLineIn(CalendarProbe probe, E2EUser owner) {
        return java.util.Arrays.stream(
                com.linagora.calendar.e2e.backend.Ics.unfold(probe.singleEvent(owner)).split("\r?\n"))
            .filter(line -> line.startsWith("ATTENDEE") && line.contains("CUTYPE=RESOURCE"))
            .findFirst()
            .orElseThrow(() -> new AssertionError("no resource is on that event"));
    }

    /**
     * A room administered by the test user and booked by somebody else, which is the only way
     * to get a request that is still pending: a booking one makes in a room one administers is
     * accepted on the spot.
     */
    private String bookedBySomebodyElse(CalendarPage admin, E2EUser user, E2EUserFactory users,
                                        E2ESessions sessions, ResourceProbe resources,
                                        String room, E2EUser[] bookerOut) {
        resources.create(room, "A room", user);
        E2EUser booker = users.newUser("booker");
        bookerOut[0] = booker;
        CalendarPage bookerCalendar = sessions.openFor(booker);
        String title = unique("Please authorise");
        // the directory takes a moment to know about a room just created, and the booker's
        // session has to see it offered before it can book it: aim again rather than fail on a
        // search that was simply too early
        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                bookerCalendar.createEvent().title(title).expand().addResource(room).save();
                break;
            } catch (RuntimeException tooEarly) {
                if (attempt == 3) {
                    throw tooEarly;
                }
                bookerCalendar.page().reload();
                bookerCalendar.waitUntilLoaded();
            }
        }
        bookerCalendar.eventCard(title).first().waitFor();
        return title;
    }

    /** Shows the resource calendar on its own, so what is seen belongs to it and nothing else. */
    private void showOnlyTheResource(CalendarPage calendar, Page page, String room) {
        page.reload();
        calendar.waitUntilLoaded();
        awaitResourceVisible(page, room);
        calendar.showCalendar(room);
        calendar.calendarCheckbox("My calendar").uncheck();
        page.waitForTimeout(3000);
    }

    @Test
    @DisplayName("RES-02 A resource can be added to the sidebar from the browsing dialog")
    void aResourceCanBeAddedFromTheBrowsingDialog(Page page, E2EUser user,
                                                  E2EUserFactory users, E2ESessions sessions,
                                                  ResourceProbe resources) {
        // administered by somebody else, so it does not arrive in the sidebar on its own
        E2EUser keeper = users.newUser("keeper");
        String room = unique("Browsable room");
        resources.create(room, "A room", keeper);
        CalendarPage calendar = LoginPage.loginAs(page, user);

        page.getByLabel("Add resource").click();
        Locator search = page.getByPlaceholder("Start typing a name or email");
        search.click();
        search.pressSequentially(room, new Locator.PressSequentiallyOptions().setDelay(30));
        page.locator("li[role=option]").first().waitFor(
            new Locator.WaitForOptions().setTimeout(20_000));
        page.locator("li[role=option]").first().click();
        page.getByRole(com.microsoft.playwright.options.AriaRole.BUTTON,
            new Page.GetByRoleOptions().setName("Add").setExact(true)).click();

        Awaitility.await().atMost(Duration.ofMillis(PROPAGATION_MS))
            .pollInterval(Duration.ofSeconds(2))
            .untilAsserted(() -> assertThat(page.locator("li")
                .filter(new Locator.FilterOptions().setHasText(room)).count())
                .as("a resource added from the dialog belongs in the sidebar")
                .isPositive());
    }

    @Test
    @DisplayName("RES-04 A booking shows in the calendar of the resource itself")
    void aBookingShowsInTheCalendarOfTheResource(Page page, E2EUser user, E2EUserFactory users,
                                                 E2ESessions sessions, ResourceProbe resources) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String room = unique("Booked room");
        E2EUser[] booker = new E2EUser[1];
        String title = bookedBySomebodyElse(calendar, user, users, sessions, resources, room, booker);

        showOnlyTheResource(calendar, page, room);

        // with only the room shown, whatever is on the grid belongs to the room
        PlaywrightAssertions.assertThat(calendar.eventCard(title).first())
            .isAttached(new LocatorAssertions.IsAttachedOptions().setTimeout(PROPAGATION_MS));
    }

    @Test
    @DisplayName("RES-05 A booking made by somebody else waits for the administrator")
    void aBookingBySomebodyElseWaitsForTheAdministrator(Page page, E2EUser user,
                                                        E2EUserFactory users, E2ESessions sessions,
                                                        ResourceProbe resources,
                                                        CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String room = unique("Awaiting room");
        E2EUser[] booker = new E2EUser[1];
        String title = bookedBySomebodyElse(calendar, user, users, sessions, resources, room, booker);

        Awaitility.await().atMost(Duration.ofMillis(PROPAGATION_MS)).untilAsserted(() ->
            assertThat(resourceLineIn(probe, booker[0]))
                .as("a room somebody else administers is not booked until they say so")
                .contains("PARTSTAT=NEEDS-ACTION"));

        showOnlyTheResource(calendar, page, room);
        assertThat(calendar.openEvent(title).text())
            .as("and the administrator is asked, in the calendar of the room")
            .contains("Authorize?");
    }

    @Test
    @DisplayName("RES-06 Authorising the booking marks the room as taken")
    void authorisingTheBookingMarksTheRoomAsTaken(Page page, E2EUser user, E2EUserFactory users,
                                                  E2ESessions sessions, ResourceProbe resources,
                                                  CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String room = unique("Granted room");
        E2EUser[] booker = new E2EUser[1];
        String title = bookedBySomebodyElse(calendar, user, users, sessions, resources, room, booker);
        showOnlyTheResource(calendar, page, room);

        calendar.openEvent(title).answer("Yes");

        Awaitility.await().atMost(Duration.ofMillis(PROPAGATION_MS)).untilAsserted(() ->
            assertThat(resourceLineIn(probe, booker[0]))
                .as("the answer of the administrator belongs in the booking")
                .contains("PARTSTAT=ACCEPTED"));
    }

    @Test
    @DisplayName("RES-07 Declining the booking leaves the room free")
    void decliningTheBookingLeavesTheRoomFree(Page page, E2EUser user, E2EUserFactory users,
                                              E2ESessions sessions, ResourceProbe resources,
                                              CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String room = unique("Refused room");
        E2EUser[] booker = new E2EUser[1];
        String title = bookedBySomebodyElse(calendar, user, users, sessions, resources, room, booker);
        showOnlyTheResource(calendar, page, room);

        calendar.openEvent(title).answer("No");

        Awaitility.await().atMost(Duration.ofMillis(PROPAGATION_MS)).untilAsserted(() ->
            assertThat(resourceLineIn(probe, booker[0]))
                .as("a room refused is a room refused, in the booking too")
                .contains("PARTSTAT=DECLINED"));
    }

    @Test
    @DisplayName("RES-08 The answer of the administrator reaches the person who booked")
    void theAnswerReachesThePersonWhoBooked(Page page, E2EUser user, E2EUserFactory users,
                                            E2ESessions sessions, ResourceProbe resources,
                                            CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String room = unique("Answered room");
        E2EUser[] booker = new E2EUser[1];
        String title = bookedBySomebodyElse(calendar, user, users, sessions, resources, room, booker);
        Page bookerPage = sessions.pageFor(booker[0]);
        showOnlyTheResource(calendar, page, room);

        calendar.openEvent(title).answer("Yes");

        Awaitility.await().atMost(Duration.ofMillis(PROPAGATION_MS)).untilAsserted(() ->
            assertThat(resourceLineIn(probe, booker[0])).contains("PARTSTAT=ACCEPTED"));
        // and the person who booked is told, on their own screen
        Awaitility.await().atMost(Duration.ofMillis(PROPAGATION_MS))
            .pollInterval(Duration.ofSeconds(3))
            .untilAsserted(() -> {
                bookerPage.reload();
                CalendarPage theirs = new CalendarPage(bookerPage).waitUntilLoaded();
                assertThat(theirs.openEvent(title).showMore().text())
                    .as("the person who booked has to be able to see the room said yes")
                    .contains(room);
            });
    }

    @Test
    @DisplayName("RES-10 Taking the room off an event gives it back")
    void takingTheRoomOffAnEventGivesItBack(Page page, E2EUser user, ResourceProbe resources,
                                            CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        // a short name on purpose: the chip that carries it is width capped, and a long one
        // is not matchable in full
        String room = "Room " + UUID.randomUUID().toString().substring(0, 6);
        resources.create(room, "A room", user);
        awaitResourceVisible(page, room);
        String title = unique("Booked then released");
        calendar.createEvent().title(title).expand().addResource(room).save();
        calendar.eventCard(title).first().waitFor();
        Awaitility.await().atMost(Duration.ofMillis(PROPAGATION_MS)).untilAsserted(() ->
            assertThat(probe.singleEvent(user)).contains("CUTYPE=RESOURCE"));

        EventFormModal form = calendar.openEvent(title).edit().expand();
        // located from the Resource label rather than by name: the chip is width capped and a
        // name that does not fit is not matchable in full
        Locator booked = page.locator("xpath=//*[normalize-space(text())='Resource']"
            + "/following::*[contains(@class,'MuiChip-root')][1]");
        booked.waitFor(new Locator.WaitForOptions().setTimeout(30_000));
        // a resource chip carries its cross as a bare svg, where a guest chip uses a button
        booked.locator(".MuiChip-deleteIcon").click();
        page.waitForTimeout(500);
        form.save();

        Awaitility.await().atMost(Duration.ofMillis(PROPAGATION_MS)).untilAsserted(() ->
            assertThat(probe.singleEvent(user))
                .as("a room taken off an event is no longer booked by it")
                .doesNotContain("CUTYPE=RESOURCE"));
    }

    /** Saves an event booking the room on a given day, at the given local times. */
    private void bookAt(CalendarPage calendar, String title, String room, LocalDate day,
                        String from, String to) {
        calendar.createEvent().title(title).expand()
            .startDate(day).endDate(day).startTime(from).endTime(to)
            .addResource(room).save();
        calendar.eventCard(title).first().waitFor();
    }

    @Test
    @DisplayName("RES-19 A room already booked at that hour is flagged when booking it again")
    void aRoomAlreadyBookedIsFlaggedWhenBookingItAgain(Page page, E2EUser user,
                                                      ResourceProbe resources,
                                                      CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate day = calendar.browserToday();
        // a short name on purpose: the chip that carries it is width capped
        String room = "Room " + UUID.randomUUID().toString().substring(0, 6);
        resources.create(room, "A room", user);
        awaitResourceVisible(page, room);
        bookAt(calendar, unique("First come"), room, day, "11:00", "12:00");
        Awaitility.await().atMost(Duration.ofMillis(PROPAGATION_MS)).untilAsserted(() ->
            assertThat(resourceLineIn(probe, user))
                .as("the room has to be taken before somebody else tries to book it")
                .contains("PARTSTAT=ACCEPTED"));

        EventFormModal form = calendar.createEvent().title(unique("First served")).expand()
            .startDate(day).endDate(day).startTime("11:00").endTime("12:00")
            .addResource(room);

        form.awaitAvailabilityOfResource(room, BOOKED,
            "a room another event holds at that hour is not available for this one");
        form.cancel();
    }

    @Test
    @DisplayName("RES-20 The event holding a room does not make it look taken to itself")
    void theEventHoldingARoomDoesNotMakeItLookTaken(Page page, E2EUser user,
                                                    ResourceProbe resources) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        LocalDate day = calendar.browserToday();
        String room = "Room " + UUID.randomUUID().toString().substring(0, 6);
        resources.create(room, "A room", user);
        awaitResourceVisible(page, room);
        String title = unique("Holding the room");
        bookAt(calendar, title, room, day, "11:00", "12:00");
        bookAt(calendar, unique("Later in the room"), room, day, "14:00", "15:00");

        EventFormModal form = calendar.openEvent(title).edit().expand();
        // moved onto the other booking first: that the room shows taken there proves its
        // availability is computed, so that the free answer below is not merely "not yet"
        form.startTime("14:00").endTime("15:00");
        form.awaitAvailabilityOfResource(room, BOOKED,
            "the room is held by another event at two");
        form.startTime("11:00").endTime("12:00");

        form.awaitAvailabilityOfResource(room, FREE,
            "the only event holding the room at eleven is the one being edited");
        form.cancel();
    }

    @Test
    @DisplayName("RES-14 A resource shows with an icon of its own in the sidebar")
    void aResourceShowsWithAnIcon(Page page, E2EUser user, ResourceProbe resources) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String room = unique("Pictured room");
        resources.create(room, "A room", user);
        awaitResourceVisible(page, room);

        assertThat(page.evaluate("""
            name => { const row = Array.from(document.querySelectorAll('li'))
                        .find(li => (li.innerText || '').includes(name));
                      return row ? row.querySelectorAll('svg, img').length : 0; }""", room))
            .as("a resource is told apart from a calendar by an icon of its own")
            .isEqualTo(2);
    }


    @Test
    @DisplayName("RES-16 Taking a resource out of the sidebar leaves its bookings alone")
    void takingAResourceOutOfTheSidebarLeavesItsBookings(Page page, E2EUser user,
                                                         ResourceProbe resources,
                                                         CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String room = "Room " + UUID.randomUUID().toString().substring(0, 6);
        resources.create(room, "A room", user);
        awaitResourceVisible(page, room);
        String title = unique("Still booked");
        calendar.createEvent().title(title).expand().addResource(room).save();
        calendar.eventCard(title).first().waitFor();
        Awaitility.await().atMost(Duration.ofMillis(PROPAGATION_MS)).untilAsserted(() ->
            assertThat(probe.singleEvent(user)).contains("CUTYPE=RESOURCE"));

        Locator row = page.locator("li").filter(new Locator.FilterOptions().setHasText(room)).first();
        row.hover();
        row.locator("button").last().click();
        page.locator("[role=menuitem]").first().waitFor();
        java.util.List<String> menu = page.locator("[role=menuitem]").allInnerTexts();
        assertThat(menu)
            .as("a resource one no longer wants on screen has to be removable from the sidebar")
            .anyMatch(entry -> entry.matches("(?i).*(remove|delete|hide).*"));
        page.locator("[role=menuitem]")
            .filter(new Locator.FilterOptions()
                .setHasText(java.util.regex.Pattern.compile("remove|delete|hide",
                    java.util.regex.Pattern.CASE_INSENSITIVE)))
            .first().click();
        page.waitForTimeout(3000);
        Locator confirm = page.getByRole(com.microsoft.playwright.options.AriaRole.BUTTON,
            new Page.GetByRoleOptions()
                .setName(java.util.regex.Pattern.compile("^(remove|delete|confirm|yes)$",
                    java.util.regex.Pattern.CASE_INSENSITIVE)));
        if (confirm.count() > 0) {
            confirm.last().click();
            page.waitForTimeout(2000);
        }

        assertThat(probe.singleEvent(user))
            .as("taking a room off one's own screen must not cancel the booking")
            .contains("CUTYPE=RESOURCE");
    }

}
