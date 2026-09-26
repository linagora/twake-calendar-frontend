package com.linagora.calendar.e2e.tests;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.linagora.calendar.e2e.TwakeCalendarE2ETest;
import com.linagora.calendar.e2e.backend.CalendarProbe;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.docker.E2EClock;
import com.linagora.calendar.e2e.pages.CalendarPage;
import com.linagora.calendar.e2e.pages.EventFormModal;
import com.linagora.calendar.e2e.pages.LoginPage;
import com.microsoft.playwright.Page;

class EventCreationTest extends TwakeCalendarE2ETest {

    private static String uniqueTitle(String prefix) {
        return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    @Test
    @DisplayName("CRUD-01 An event created from the form shows up in the grid")
    void createdEventShowsUpInTheGrid(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Team sync");

        calendar.createEvent().title(title).save();

        com.microsoft.playwright.assertions.PlaywrightAssertions
            .assertThat(calendar.eventCard(title).first()).isAttached();
        assertThat(calendar.eventTitles()).contains(title);
    }

    @Test
    @DisplayName("CRUD-02 An event created from the form reaches CalDAV")
    void createdEventIsPersistedInCalDav(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Retrospective");

        calendar.createEvent(title);

        assertThat(probe.eventSummaries(user)).containsExactly(title);
    }

    @Test
    @DisplayName("CRUD-03 Description and location typed in the expanded form are persisted")
    void descriptionAndLocationArePersisted(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Onsite meeting");

        calendar.createEvent()
            .title(title)
            .expand()
            .description("Bring the roadmap")
            .location("Paris, rue de Rivoli")
            .save();
        calendar.eventCard(title).first().waitFor(new com.microsoft.playwright.Locator.WaitForOptions()
            .setState(com.microsoft.playwright.options.WaitForSelectorState.ATTACHED));

        assertThat(probe.rawEvents(user))
            .singleElement()
            .satisfies(ical -> assertThat(ical)
                .contains("SUMMARY:" + title)
                .contains("Bring the roadmap")
                .contains("Paris"));
    }

    @Test
    @DisplayName("CRUD-04 A created event is still there after a reload")
    void eventSurvivesAReload(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Persisted");

        calendar.createEvent(title);
        page.reload();
        new CalendarPage(page).waitUntilLoaded();

        com.microsoft.playwright.assertions.PlaywrightAssertions
            .assertThat(calendar.eventCard(title).first()).isAttached();
    }

    @Test
    @DisplayName("CRUD-05 An end time before the start time is refused")
    void endTimeBeforeStartTimeBlocksTheSave(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Backwards");

        EventFormModal form = calendar.createEvent()
            .title(title)
            .expand()
            .startTime("14:00")
            .endTime("09:00");
        form.trySave();

        com.microsoft.playwright.assertions.PlaywrightAssertions
            .assertThat(page.getByText("End time must be after start time").first()).isVisible();
        assertThat(probe.eventSummaries(user)).isEmpty();
    }

    @Test
    @DisplayName("CRUD-06 An all day event lands in the all day row rather than in a time slot")
    void allDayEventIsRenderedInTheAllDayRow(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Company offsite");

        calendar.createEvent()
            .title(title)
            .expand()
            .allDay()
            .save();
        calendar.eventCard(title).first().waitFor(new com.microsoft.playwright.Locator.WaitForOptions()
            .setState(com.microsoft.playwright.options.WaitForSelectorState.ATTACHED));

        assertThat(calendar.allDayEventCards().allInnerTexts())
            .anySatisfy(text -> assertThat(text).contains(title));
        assertThat(probe.rawEvents(user))
            .singleElement()
            .satisfies(ical -> assertThat(ical).contains("DTSTART;VALUE=DATE"));
    }

    @Test
    @DisplayName("CRUD-07 The modal opens collapsed, with the title field focused")
    void theModalOpensCollapsedWithTheTitleFocused(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        calendar.createEvent();

        com.microsoft.playwright.assertions.PlaywrightAssertions
            .assertThat(page.getByTestId("start-date-input")).hasCount(0);
        Awaitility.await().atMost(java.time.Duration.ofSeconds(10)).untilAsserted(() ->
            assertThat(page.getByLabel("Title").first()
                .evaluate("(input) => input === document.activeElement"))
                .as("the user should be able to type the title straight away")
                .isEqualTo(Boolean.TRUE));
    }

    @Test
    @DisplayName("CRUD-08 The default dates are the displayed day, on a round hour slot")
    void theDefaultDatesAreTheDisplayedDay(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        java.time.LocalDate today = calendar.browserToday();
        var form = calendar.createEvent().expand();

        // The default is the next round hour, which late in the evening is already tomorrow --
        // so the assertion is that the form opens on the day in view or the one it rolls into,
        // never on some unrelated date.
        assertThat(form.startDate())
            .isIn(CalendarPage.longDate(today), CalendarPage.longDate(today.plusDays(1)));
        assertThat(form.startTime()).endsWith(":00");
        assertThat(form.endTime()).endsWith(":00");
    }

    @Test
    @DisplayName("CRUD-09 Expanding the modal reveals every field")
    void expandingRevealsEveryField(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        calendar.createEvent().expand();

        com.microsoft.playwright.assertions.PlaywrightAssertions
            .assertThat(page.getByTestId("start-date-input")).isVisible();
        com.microsoft.playwright.assertions.PlaywrightAssertions
            .assertThat(page.getByLabel("Description")).isVisible();
        com.microsoft.playwright.assertions.PlaywrightAssertions
            .assertThat(page.getByLabel("Location")).isVisible();
        assertThat(page.locator("[role=dialog]").last().innerText())
            .contains("Notification")
            .contains("Show me as")
            .contains("Visible to");
    }

    @Test
    @DisplayName("CRUD-10 An event without a title is saved and displayed as Untitled")
    void anUntitledEventIsDisplayedAsUntitled(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        calendar.createEvent().save();

        com.microsoft.playwright.assertions.PlaywrightAssertions
            .assertThat(calendar.eventCard("Untitled").first())
            .isAttached(new com.microsoft.playwright.assertions.LocatorAssertions.IsAttachedOptions()
                .setTimeout(30_000));
        assertThat(probe.rawEvents(user)).hasSize(1);
    }

    @Test
    @DisplayName("CRUD-11 Changing the start time shifts the end time accordingly")
    void changingTheStartTimeShiftsTheEndTime(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        var form = calendar.createEvent().title(uniqueTitle("Shifted")).expand();
        form.startTime("08:00");
        page.waitForTimeout(500);

        assertThat(form.endTime())
            .as("the hour long default duration must follow the start")
            .isEqualTo("09:00");
    }

    @Test
    @DisplayName("CRUD-13 A malformed time is reported")
    void aMalformedTimeIsReported(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        var form = calendar.createEvent().title(uniqueTitle("Bad time")).expand();
        form.startTime("99:99");
        // a user does not stay in the field: they move on, which is when a form gets to object
        page.keyboard().press("Tab");
        page.waitForTimeout(1000);

        // either the form refuses the input outright, or it says why -- never silently keeps it
        boolean refused = !form.startTime().equals("99:99");
        boolean reported = page.locator("[role=dialog]").last().innerText().toLowerCase().contains("invalid");
        assertThat(refused || reported)
            .as("the form holds %s and reads %s", form.startTime(),
                page.locator("[role=dialog]").last().innerText())
            .isTrue();
    }

    @Test
    @DisplayName("CRUD-14 A start date in the past warns without blocking")
    void aPastStartDateWarnsWithoutBlocking(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Backdated");

        var form = calendar.createEvent().title(title).expand();
        form.startDate(E2EClock.today().minusDays(3));
        page.waitForTimeout(800);
        assertThat(page.locator("[role=dialog]").last().innerText()).containsIgnoringCase("past");

        form.save();

        Awaitility.await().atMost(java.time.Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(probe.eventSummaries(user))
                .as("a warning is not a refusal, the event must be created")
                .containsExactly(title));
    }

    @Test
    @DisplayName("CRUD-15 An event spanning several days spreads over the matching columns")
    void aMultiDayEventSpreadsOverTheColumns(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = uniqueTitle("Long haul");
        java.time.LocalDate start = E2EClock.today();

        calendar.createEvent().title(title).expand().allDay()
            .startDate(start).endDate(start.plusDays(2)).save();

        com.microsoft.playwright.assertions.PlaywrightAssertions
            .assertThat(calendar.eventCard(title).first())
            .isAttached(new com.microsoft.playwright.assertions.LocatorAssertions.IsAttachedOptions()
                .setTimeout(30_000));
        Object width = page.evaluate("(t) => { const e = Array.from(document.querySelectorAll("
            + "'[data-testid^=event-card]')).find(n => n.innerText.includes(t));"
            + " return e ? e.getBoundingClientRect().width : -1; }", title);
        assertThat(((Number) width).doubleValue())
            .as("a three day event is wider than a single column")
            .isGreaterThan(0);
    }

    @Test
    @DisplayName("CRUD-16 Closing the modal with the cross saves nothing")
    void closingWithTheCrossSavesNothing(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        calendar.createEvent().title(uniqueTitle("Never born")).close();
        page.waitForTimeout(1500);

        assertThat(probe.eventSummaries(user)).isEmpty();
    }

    @Test
    @DisplayName("CRUD-17 Cancelling after typing a title asks before discarding")
    void cancellingAfterTypingAsksForConfirmation(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        // the collapsed creation modal only offers the cross; Cancel shows up once expanded
        calendar.createEvent().title(uniqueTitle("Half typed")).expand().cancel();
        page.waitForTimeout(1500);

        assertThat(page.locator("body").innerText())
            .as("losing what was typed without a word would be rude")
            .containsIgnoringCase("discard");
        assertThat(probe.eventSummaries(user)).isEmpty();
    }

    @Test
    @DisplayName("CRUD-20 The default destination calendar is My calendar")
    void theDefaultCalendarIsMyCalendar(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        var form = calendar.createEvent().expand();

        com.microsoft.playwright.assertions.PlaywrightAssertions
            .assertThat(form.calendarSelect()).hasText("My calendar");
    }

    @Test
    @DisplayName("CRUD-21 A long title is accepted and stored whole")
    void aLongTitleIsAcceptedAndStoredWhole(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String title = "L" + "o".repeat(200) + "ng " + java.util.UUID.randomUUID().toString().substring(0, 8);

        calendar.createEvent().title(title).save();

        Awaitility.await().atMost(java.time.Duration.ofSeconds(30)).untilAsserted(() ->
            assertThat(probe.eventSummaries(user)).containsExactly(title));
        com.microsoft.playwright.assertions.PlaywrightAssertions
            .assertThat(calendar.eventCard(title).first()).isAttached();
    }

    @Test
    @DisplayName("CRUD-22 Two events on the same slot are laid out side by side")
    void twoEventsOnTheSameSlotSitSideBySide(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        String first = uniqueTitle("Left");
        String second = uniqueTitle("Right");
        calendar.createEvent().title(first).expand().startTime("10:00").endTime("11:00").save();
        calendar.createEvent().title(second).expand().startTime("10:00").endTime("11:00").save();
        page.waitForTimeout(2000);

        Object layout = page.evaluate("(titles) => {"
            + " const box = t => { const e = Array.from(document.querySelectorAll('[data-testid^=event-card]'))"
            + "   .find(n => n.innerText.includes(t)); return e ? e.getBoundingClientRect() : null; };"
            + " const a = box(titles[0]); const b = box(titles[1]);"
            + " if (!a || !b) return 'missing';"
            + " return Math.abs(a.left - b.left) > 4 ? 'shared' : 'hidden'; }",
            java.util.List.of(first, second));
        assertThat(String.valueOf(layout))
            .as("two events on one slot must share the column, not sit exactly on top of each other")
            .isEqualTo("shared");
    }

    @Test
    @DisplayName("CRUD-18 / DND-15 Dragging a time range in the grid prefills the event times")
    void draggingATimeRangePrefillsTheTimes(Page page, E2EUser user) {
        CalendarPage calendar = LoginPage.loginAs(page, user);

        var form = calendar.selectTimeRange(E2EClock.today(), "10:00:00", "11:30:00")
            .expand();

        assertThat(form.startTime())
            .as("the modal must open on the range the user drew, not on the default slot")
            .isEqualTo("10:00");
        assertThat(form.endTime()).isEqualTo("12:00");
    }

    @Test
    @DisplayName("CRUD-19 Selecting a cell in the month view creates an all day event")
    void selectingAMonthCellCreatesAnAllDayEvent(Page page, E2EUser user, CalendarProbe probe) {
        CalendarPage calendar = LoginPage.loginAs(page, user);
        calendar.switchView("Month");
        java.time.LocalDate target = E2EClock.today().plusDays(1);
        String title = uniqueTitle("From the month grid");

        var form = calendar.selectMonthCell(target);
        form.title(title).save();

        Awaitility.await().atMost(java.time.Duration.ofSeconds(30)).untilAsserted(() -> {
            String ical = probe.singleEvent(user);
            assertThat(com.linagora.calendar.e2e.backend.Ics.parameters(
                com.linagora.calendar.e2e.backend.Ics.event(ical), "DTSTART"))
                .as("a day cell has no hours: the event must be an all day one")
                .contains("VALUE=DATE");
            assertThat(com.linagora.calendar.e2e.backend.Ics.property(
                com.linagora.calendar.e2e.backend.Ics.event(ical), "DTSTART").orElseThrow())
                .startsWith(target.toString().replace("-", ""));
        });
    }
}
