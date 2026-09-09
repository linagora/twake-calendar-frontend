package com.linagora.calendar.e2e.pages;

import java.util.List;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Mouse;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import com.microsoft.playwright.options.BoundingBox;
import com.microsoft.playwright.options.WaitForSelectorState;

/**
 * The main authenticated screen: menubar, sidebar and the FullCalendar grid.
 *
 * <p>Locators go through accessible names rather than CSS classes: the app is built on MUI and
 * emotion, its class names are generated and change on every dependency bump, whereas an
 * aria-label change is a user visible change worth failing on.
 */
public class CalendarPage {
    /** FullCalendar renders one such element per event, carrying the event uid. */
    public static final String EVENT_CARD = "[data-testid^=event-card]";

    private final Page page;

    public CalendarPage(Page page) {
        this.page = page;
    }

    public Page page() {
        return page;
    }

    public CalendarPage waitUntilLoaded() {
        page.waitForURL("**/calendar**");
        page.locator(".fc-view-harness").waitFor(
            new Locator.WaitForOptions().setState(WaitForSelectorState.VISIBLE));
        return this;
    }

    // ------------------------------------------------------------------ events

    /** Opens the creation modal, collapsed. Call {@link EventFormModal#expand()} for the rest. */
    public EventFormModal createEvent() {
        Locator button = page.getByLabel("Create a new event");
        EventFormModal form = new EventFormModal(page);
        // Under a loaded backend the shell sometimes swallows this click: nothing opens, and a
        // plain wait would spend its whole budget on a click that will never arrive. Click again
        // instead -- but only while no dialog is up, so a slow form is never opened twice.
        for (int attempt = 1; attempt <= 3; attempt++) {
            button.click();
            if (form.openedWithin(10_000)) {
                return form;
            }
            if (form.isOnScreen()) {
                return form.waitUntilOpen();
            }
        }
        throw new AssertionError("The event creation form never opened, after 3 clicks on Create");
    }

    /** Creates a plain event with only a title, and returns once it shows up in the grid. */
    public CalendarPage createEvent(String title) {
        createEvent().title(title).save();
        eventCard(title).waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.ATTACHED));
        return this;
    }

    public Locator eventCards() {
        return page.locator(EVENT_CARD);
    }

    public Locator eventCard(String title) {
        return page.locator(EVENT_CARD).filter(new Locator.FilterOptions().setHasText(title));
    }

    /**
     * The days an event is rendered on, as ISO dates, read from the grid column each card sits
     * in. The natural way to assert what a recurrence rule actually produces.
     */
    @SuppressWarnings("unchecked")
    public List<String> eventDates(String title) {
        return (List<String>) page.evaluate(
            "(t) => Array.from(document.querySelectorAll('[data-testid^=event-card]'))"
            + ".filter(e => e.innerText.includes(t))"
            + ".map(e => { const c = e.closest('[data-date]'); return c ? c.getAttribute('data-date') : null; })"
            + ".filter(Boolean).sort()", title);
    }

    public List<String> eventTitles() {
        return page.locator(EVENT_CARD).allInnerTexts().stream()
            .map(text -> text.split("\n")[0].trim())
            .toList();
    }

    public EventPreviewPopover openEvent(String title) {
        eventCard(title).first().click();
        return new EventPreviewPopover(page).waitUntilOpen();
    }

    /** All day events live in their own row, above the time grid. */
    public Locator allDayEventCards() {
        return page.locator(".fc-daygrid-body " + EVENT_CARD);
    }

    // -------------------------------------------------------------- navigation

    public CalendarPage next() {
        // exact: the mini calendar has its own "Next month" button
        page.getByLabel("Next", new Page.GetByLabelOptions().setExact(true)).click();
        return this;
    }

    public CalendarPage previous() {
        page.getByLabel("Previous", new Page.GetByLabelOptions().setExact(true)).click();
        return this;
    }

    public CalendarPage today() {
        page.getByLabel("Today", new Page.GetByLabelOptions().setExact(true)).click();
        return this;
    }

    /**
     * Walks the grid to the given month, reading where it actually is at every step rather than
     * counting from today: successive calls would otherwise navigate from the wrong origin.
     */
    public CalendarPage goToMonth(java.time.YearMonth month) {
        for (int guard = 0; guard < 60; guard++) {
            java.time.YearMonth displayed = displayedMonth();
            if (displayed.equals(month)) {
                return this;
            }
            if (displayed.isBefore(month)) {
                next();
            } else {
                previous();
            }
            page.waitForTimeout(150);
        }
        throw new AssertionError("Could not reach " + month + ", the grid shows " + periodTitle());
    }

    /** The month the menubar title names. */
    public java.time.YearMonth displayedMonth() {
        java.util.regex.Matcher matcher = java.util.regex.Pattern
            .compile("([A-Z][a-z]+)\\s+(\\d{4})").matcher(periodTitle());
        if (!matcher.find()) {
            throw new AssertionError("No month in the menubar title: " + periodTitle());
        }
        return java.time.YearMonth.parse(matcher.group(1) + " " + matcher.group(2),
            java.time.format.DateTimeFormatter.ofPattern("MMMM yyyy", java.util.Locale.ENGLISH));
    }

    /**
     * Waits until the live update socket is open.
     *
     * <p>A test that writes on CalDAV and expects the grid to react has to do it after the
     * socket is up: a change made in between is delivered to nobody, and since nothing reloads
     * the page afterwards the event simply never shows. Waiting on the grid being loaded is not
     * enough, the socket comes later, and the gap widens when several classes share the backend.
     */
    public CalendarPage waitUntilLiveConnected() {
        page.waitForFunction("() => window.__ws && window.__ws.readyState === 1",
            null, new Page.WaitForFunctionOptions().setTimeout(60_000));
        return this;
    }

    public CalendarPage refresh() {
        page.getByLabel("Refresh").click();
        return this;
    }

    /** One of Month, Week, Day, Schedule. */
    public CalendarPage switchView(String view) {
        page.getByLabel("Select view").click();
        page.getByRole(AriaRole.OPTION, new Page.GetByRoleOptions().setName(view).setExact(true)).click();
        return this;
    }

    /** FullCalendar view class, e.g. {@code fc-dayGridMonth-view}. */
    public String currentViewClass() {
        return String.valueOf(page.evaluate(
            "() => document.querySelector('.fc-view-harness').firstElementChild.className"));
    }

    /** The date range currently displayed, as the column headers spell it. */
    public List<String> visibleDayHeaders() {
        return page.locator(".fc-col-header-cell-cushion").allInnerTexts().stream()
            .map(header -> header.replace("\n", " ").trim())
            .toList();
    }

    /** The grid column of a given day, to assert an event landed on the right one. */
    public Locator dayColumn(java.time.LocalDate day) {
        return page.locator("[data-date='" + day + "']");
    }

    /** The long date format the pickers display: "Monday, August 31, 2026". */
    public static String longDate(java.time.LocalDate day) {
        return day.format(java.time.format.DateTimeFormatter
            .ofPattern("EEEE, MMMM d, yyyy", java.util.Locale.ENGLISH));
    }

    /** The period the grid currently shows, as the menubar spells it out. */
    public String periodTitle() {
        return page.locator(".current-date-time").innerText().replace("\n", " ").trim();
    }

    public Locator menubar() {
        return page.locator(".menubar");
    }

    /** A day cell of the sidebar mini calendar. */
    public Locator miniCalendarDay(int dayOfMonth) {
        return page.locator("button.MuiPickerDay-root:not(.MuiPickerDay-dayOutsideMonth)")
            .filter(new Locator.FilterOptions()
                .setHasText(java.util.regex.Pattern.compile("^" + dayOfMonth + "$")))
            .first();
    }

    public String miniCalendarMonth() {
        return page.locator(".MuiPickersCalendarHeader-label").first().innerText().trim();
    }

    public CalendarPage miniCalendarNextMonth() {
        page.getByLabel("Next month").click();
        return this;
    }

    /** The expandable sidebar sections: My calendars, Other calendars, Resources... */
    public Locator sidebarSection(String name) {
        return page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName(name));
    }

    /** The reverse of {@link #longDate}: reads a date back out of a form field. */
    public static java.time.LocalDate parseLongDate(String rendered) {
        return java.time.LocalDate.parse(rendered, java.time.format.DateTimeFormatter
            .ofPattern("EEEE, MMMM d, yyyy", java.util.Locale.ENGLISH));
    }

    /**
     * Today according to the browser, which is the clock the application itself goes by.
     *
     * <p>A suite that runs for a quarter of an hour can straddle midnight, and a date the test
     * recomputes in Java afterwards is then a day away from the one the page rendered.
     */
    public java.time.LocalDate browserToday() {
        return java.time.LocalDate.parse(String.valueOf(page.evaluate("""
            () => { const now = new Date();
                    return now.getFullYear() + '-'
                      + String(now.getMonth() + 1).padStart(2, '0') + '-'
                      + String(now.getDate()).padStart(2, '0'); }""")));
    }

    /** The first day the grid currently shows, read from the grid itself. */
    public java.time.LocalDate firstVisibleDate() {
        String date = String.valueOf(page.evaluate(
            "() => { const c = document.querySelector('[data-date]');"
            + " return c ? c.getAttribute('data-date') : null; }"));
        return java.time.LocalDate.parse(date);
    }

    /** Every day the grid currently shows. */
    @SuppressWarnings("unchecked")
    public List<String> visibleDates() {
        return (List<String>) page.evaluate(
            "() => Array.from(new Set(Array.from(document.querySelectorAll('[data-date]'))"
            + ".map(e => e.getAttribute('data-date')))).sort()");
    }

    public Locator weekNumber() {
        return page.locator(".fc-timegrid-axis-cushion");
    }

    // ------------------------------------------------------------------- menus

    /** The sidebar checkbox toggling the display of one calendar. */
    public Locator calendarCheckbox(String calendarName) {
        return page.locator("input[type=checkbox][aria-label='" + calendarName + "']");
    }

    /** Opens the "Add new calendar" dialog from the sidebar. */
    public CalendarModal addCalendar() {
        page.getByLabel("Add a new personal calendar").click();
        return new CalendarModal(page).waitUntilOpen();
    }

    /**
     * Makes sure a calendar is ticked, so its events actually reach the grid. A freshly created
     * calendar is not always part of the selection.
     */
    public CalendarPage showCalendar(String calendarName) {
        Locator checkbox = calendarCheckbox(calendarName);
        checkbox.waitFor();
        if (!checkbox.isChecked()) {
            checkbox.check();
            page.waitForTimeout(800);
        }
        return this;
    }

    /** The per calendar menu button of a sidebar row. */
    public Locator calendarMenu(String calendarName) {
        return page.locator("li:has(label[aria-label='" + calendarName + "']) button");
    }

    /**
     * Opens the overflow menu of a sidebar calendar row. The button only shows on hover, so the
     * row is hovered first.
     */
    public CalendarPage openCalendarMenu(String calendarName) {
        Locator row = page.locator("li:has(label[aria-label='" + calendarName + "'])");
        row.hover();
        row.locator("button").last().click();
        page.locator("[role=menuitem]").first().waitFor();
        return this;
    }

    /** What the overflow menu of a calendar offers. */
    public List<String> calendarMenuEntries(String calendarName) {
        openCalendarMenu(calendarName);
        List<String> entries = page.locator("[role=menuitem]").allInnerTexts();
        page.keyboard().press("Escape");
        return entries;
    }

    /** Opens the settings dialog of a calendar, through Modify. */
    public CalendarModal modifyCalendar(String calendarName) {
        openCalendarMenu(calendarName);
        page.getByRole(AriaRole.MENUITEM, new Page.GetByRoleOptions().setName("Modify")).click();
        return new CalendarModal(page).waitUntilOpen();
    }

    // ------------------------------------------------- browsing other calendars

    /**
     * Opens the sidebar dialog that looks for the calendars of other people.
     *
     * <p>Not to be confused with the search of the menubar, which looks for events, nor with
     * "Add resource", which is a dialog of its own searching the resources of the domain.
     */
    public CalendarPage browseOtherCalendars() {
        page.getByLabel("Add shared calendar").click();
        page.getByPlaceholder("Start typing a name or email").waitFor();
        return this;
    }

    /** Types a query into that dialog and hands back what it ends up offering. */
    public List<String> searchOtherCalendars(String query) {
        Locator field = page.getByPlaceholder("Start typing a name or email");
        field.click();
        field.fill("");
        field.pressSequentially(query, new Locator.PressSequentiallyOptions().setDelay(30));
        page.waitForTimeout(3500);
        return page.locator("li[role=option]").allInnerTexts().stream()
            .map(option -> option.replace("\n", " ").trim())
            .toList();
    }

    /** Picks somebody in that dialog and returns what it says about their calendars. */
    public String pickInOtherCalendars(String query) {
        searchOtherCalendars(query);
        page.locator("li[role=option]").first().click();
        page.waitForTimeout(3500);
        return page.locator("[role=dialog]").last().innerText();
    }

    /**
     * Calls the search off. Cancel is the way a user does it, but a suggestion list opened over
     * the button leaves it unclickable, so Escape stands in when that happens: what the caller
     * asked for is the dialog gone, not one particular way of dismissing it.
     */
    public void cancelBrowsing() {
        try {
            page.getByRole(AriaRole.BUTTON,
                    new Page.GetByRoleOptions().setName("Cancel").setExact(true)).last()
                .click(new Locator.ClickOptions().setTimeout(10_000));
        } catch (com.microsoft.playwright.TimeoutError covered) {
            page.keyboard().press("Escape");
        }
        page.getByPlaceholder("Start typing a name or email").waitFor(
            new Locator.WaitForOptions().setState(WaitForSelectorState.DETACHED));
    }

    /** Opens the printable schedule dialog of a calendar, through its overflow menu. */
    public PrintDialog printCalendar(String calendarName) {
        openCalendarMenu(calendarName);
        page.getByRole(AriaRole.MENUITEM,
            new Page.GetByRoleOptions().setName("Print schedule")).click();
        return new PrintDialog(page).waitUntilOpen();
    }

    /** Deletes a calendar, going through the confirmation. */
    public void deleteCalendar(String calendarName) {
        openCalendarMenu(calendarName);
        page.getByRole(AriaRole.MENUITEM,
            new Page.GetByRoleOptions().setName(java.util.regex.Pattern.compile("Delete|Remove"))).click();
        page.getByRole(AriaRole.BUTTON,
            new Page.GetByRoleOptions().setName(java.util.regex.Pattern.compile("^(Delete|Remove)$")))
            .last().click();
    }

    /**
     * Selects a time range in the week grid the way a user does, by dragging, which opens the
     * creation modal prefilled with the range.
     */
    public EventFormModal selectTimeRange(java.time.LocalDate day, String fromSlot, String toSlot) {
        var column = page.locator(".fc-timegrid-col[data-date='" + day + "']").last().boundingBox();
        var from = page.locator(".fc-timegrid-slot[data-time='" + fromSlot + "']").first().boundingBox();
        var to = page.locator(".fc-timegrid-slot[data-time='" + toSlot + "']").first().boundingBox();
        double x = column.x + column.width / 2;

        page.mouse().move(x, from.y + 2);
        page.mouse().down();
        page.mouse().move(x, to.y + to.height - 2, new com.microsoft.playwright.Mouse.MoveOptions().setSteps(12));
        page.mouse().up();
        return new EventFormModal(page).waitUntilOpen();
    }

    // ------------------------------------------------------------- drag and drop

    /**
     * Drags an event card so that its top edge lands on {@code slot} of {@code day}.
     *
     * <p>Expressed as a translation rather than as a destination point: FullCalendar moves the
     * event by the mouse delta, so grabbing the middle of a card and releasing over the target
     * slot would drop it half a card too low.
     */
    public CalendarPage dragEventToSlot(String title, java.time.LocalDate day, String slot) {
        if (!tryDragEventToSlot(title, day, slot)) {
            throw new AssertionError("The grid never registered the gesture: move "
                + title + " to " + slot);
        }
        return this;
    }

    /**
     * Same gesture, for the scenarios where the grid is entitled to refuse it: an event the user
     * may not edit, a move the server rejects, a resize that would leave nothing. Returns whether
     * the event ended up where it was aimed.
     */
    public boolean tryDragEventToSlot(String title, java.time.LocalDate day, String slot) {
        // the destination first: reaching it may scroll the grid, and every box read before
        // that would then describe a position the card no longer occupies
        BoundingBox target = requireBox(
            page.locator(".fc-timegrid-slot[data-time='" + slot + "']").first(), "the " + slot + " slot");
        BoundingBox column = boxOf(
            page.locator(".fc-timegrid-col[data-date='" + day + "']").last(), "the column of " + day);
        BoundingBox card = boxOf(eventCard(title).first(), "the card of " + title);
        return dragUntilMoved(
            () -> {
                BoundingBox now = boxOf(eventCard(title).first(), "the card of " + title);
                drag(now.x + now.width / 2, now.y + now.height / 2,
                    column.x + column.width / 2, now.y + now.height / 2 + (target.y - now.y));
            },
            () -> Math.abs(boxOf(eventCard(title).first(), "the card of " + title).y - target.y) < 12);
    }

    /** Same day of the week grid, another column: only the date changes. */
    public CalendarPage dragEventToDay(String title, java.time.LocalDate day) {
        BoundingBox column = requireBox(
            page.locator(".fc-timegrid-col[data-date='" + day + "']").last(), "the column of " + day);
        BoundingBox card = boxOf(eventCard(title).first(), "the card of " + title);
        drag(card.x + card.width / 2, card.y + card.height / 2,
            column.x + column.width / 2, card.y + card.height / 2);
        return this;
    }

    /** Drags an event of the month grid onto another day cell. */
    public CalendarPage dragMonthEventToDay(String title, java.time.LocalDate day) {
        BoundingBox cell = requireBox(
            page.locator(".fc-daygrid-day[data-date='" + day + "'] .fc-daygrid-day-frame").first(),
            "the cell of " + day);
        boolean moved = dragUntilMoved(
            () -> {
                BoundingBox now = boxOf(eventCard(title).first(), "the card of " + title);
                drag(now.x + now.width / 2, now.y + now.height / 2,
                    cell.x + cell.width / 2, cell.y + cell.height / 2);
            },
            () -> page.locator(".fc-daygrid-day[data-date='" + day + "'] "
                + EVENT_CARD).filter(new Locator.FilterOptions().setHasText(title)).count() > 0);
        if (!moved) {
            throw new AssertionError("The grid never registered the gesture: move "
                + title + " to " + day);
        }
        return this;
    }

    /** Drags a timed event onto the all day row of a day. */
    public CalendarPage dragEventToAllDayRow(String title, java.time.LocalDate day) {
        BoundingBox card = requireBox(eventCard(title).first(), "the card of " + title);
        BoundingBox cell = requireBox(
            page.locator(".fc-daygrid-day[data-date='" + day + "']").first(), "the all day cell of " + day);
        drag(card.x + card.width / 2, card.y + card.height / 2,
            cell.x + cell.width / 2, cell.y + cell.height / 2);
        return this;
    }

    /** Drags the bottom handle of an event so that its end lands on {@code slot}. */
    public CalendarPage resizeEventEndTo(String title, String slot) {
        if (!tryResizeEventEndTo(title, slot)) {
            throw new AssertionError("The grid never registered the resize of " + title
                + " to " + slot);
        }
        return this;
    }

    /** Same, for a resize the grid is entitled to refuse. */
    public boolean tryResizeEventEndTo(String title, String slot) {
        return resize(title, "end", slot, box -> box.y + box.height);
    }

    private boolean resize(String title, String edge, String slot,
                                java.util.function.ToDoubleFunction<BoundingBox> movingEdge) {
        Locator harness = eventCard(title).first();
        harness.hover();
        // the resizers are children of the outer FullCalendar event, not of the card we render
        // inside it: `fc-event-main` is the closest ancestor matching `fc-event`, and holds none
        Locator handle = harness.locator("xpath=ancestor::*[contains(@class,'fc-timegrid-event')][1]")
            .locator(".fc-event-resizer-" + edge);
        if (handle.count() == 0) {
            throw new AssertionError("No " + edge + " resize handle on " + title
                + ", the event is probably not editable");
        }
        BoundingBox target = requireBox(
            page.locator(".fc-timegrid-slot[data-time='" + slot + "']").first(), "the " + slot + " slot");
        harness.hover();
        BoundingBox card = boxOf(harness, "the card of " + title);
        BoundingBox grip = boxOf(handle.first(), "the " + edge + " handle of " + title);
        double gripCentreY = grip.y + grip.height / 2;
        return dragUntilMoved(
            () -> {
                harness.hover();
                BoundingBox now = boxOf(harness, "the card of " + title);
                drag(grip.x + grip.width / 2, gripCentreY,
                    grip.x + grip.width / 2,
                    gripCentreY + (target.y - movingEdge.applyAsDouble(now)));
            },
            () -> Math.abs(movingEdge.applyAsDouble(
                boxOf(harness, "the card of " + title)) - target.y) < 12);
    }

    /**
     * A press, a nudge, a move and a release. The nudge matters: FullCalendar ignores a press
     * that does not travel a few pixels, and a single jump would be taken for a click.
     */
    private void drag(double fromX, double fromY, double toX, double toY) {
        page.mouse().move(fromX, fromY);
        page.mouse().down();
        // FullCalendar arms a drag only past a small threshold, and it wants the pointer to
        // travel rather than teleport: a single jump is taken for a click on the event
        page.mouse().move(fromX, fromY + 10, new Mouse.MoveOptions().setSteps(6));
        page.mouse().move(toX, toY, new Mouse.MoveOptions().setSteps(20));
        page.mouse().move(toX, toY, new Mouse.MoveOptions().setSteps(2));
        page.mouse().up();
    }

    /**
     * Runs a mouse gesture until the grid shows its effect.
     *
     * <p>A drag that the grid did not pick up leaves no trace at all: the release is read as a
     * click, the event stays put and the assertion fails much later on unchanged data. Rather
     * than key on FullCalendar's internal markers, which move with its version, this checks the
     * one thing the test actually cares about and repeats the gesture if it did not happen.
     */
    private boolean dragUntilMoved(Runnable gesture, java.util.function.BooleanSupplier moved) {
        for (int attempt = 1; attempt <= 3; attempt++) {
            gesture.run();
            page.waitForTimeout(600);
            if (moved.getAsBoolean()) {
                return true;
            }
            // a click opened the preview instead: put it away before trying again. Best effort,
            // since a gesture the grid refused outright leaves nothing to dismiss.
            if (page.getByLabel("Edit event").count() > 0) {
                page.keyboard().press("Escape");
                try {
                    page.getByLabel("Edit event").first().waitFor(new Locator.WaitForOptions()
                        .setState(WaitForSelectorState.DETACHED).setTimeout(3_000));
                } catch (com.microsoft.playwright.TimeoutError ignored) {
                    page.mouse().click(5, 5);
                }
            }
        }
        return false;
    }

    /** Brings an element into view, then measures it. */
    private BoundingBox requireBox(Locator locator, String what) {
        locator.scrollIntoViewIfNeeded();
        return boxOf(locator, what);
    }

    /** Measures an element where it already is: scrolling here would move everything else. */
    private BoundingBox boxOf(Locator locator, String what) {
        try {
            locator.waitFor(new Locator.WaitForOptions()
                .setState(WaitForSelectorState.VISIBLE).setTimeout(5_000));
        } catch (com.microsoft.playwright.TimeoutError ignored) {
            // nothing to wait for any more: the assertion below names what is missing.
        }
        BoundingBox box = locator.boundingBox();
        if (box == null) {
            throw new AssertionError("Could not locate " + what + " on screen");
        }
        return box;
    }

    /** Clicks a day cell of the month grid, which starts an all day event on that day. */
    public EventFormModal selectMonthCell(java.time.LocalDate day) {
        page.locator(".fc-daygrid-day[data-date='" + day + "'] .fc-daygrid-day-frame").first()
            .click(new Locator.ClickOptions().setPosition(20, 40));
        return new EventFormModal(page).waitUntilOpen();
    }

    // ------------------------------------------------------------- booking links

    /** Opens the appointment schedule form from the Booking links section of the sidebar. */
    public AppointmentModal createBookingLink() {
        page.getByLabel("Create appointment schedule").first().click();
        return new AppointmentModal(page).waitUntilOpen();
    }

    /** The sidebar entry of a booking link, which carries its name as accessible name. */
    public Locator bookingLinkChip(String name) {
        return page.locator("[aria-label='" + name + "']");
    }

    public List<String> bookingLinkNames() {
        return page.locator("[aria-label]").all().stream()
            .map(chip -> String.valueOf(chip.getAttribute("aria-label")))
            .toList();
    }

    /** Reopens an existing schedule for edition. */
    public AppointmentModal editBookingLink(String name) {
        bookingLinkChip(name).first().click();
        return new AppointmentModal(page).waitUntilOpen();
    }

    /** Clicks the copy button of the Booking links section and returns what landed in the clipboard. */
    public String copyBookingLink(String name) {
        bookingLinkChip(name).first().hover();
        page.getByLabel("Copy booking link").first().click();
        return String.valueOf(page.evaluate("() => navigator.clipboard.readText()"));
    }

    /**
     * The identifier a booking link is published under.
     *
     * <p>Read from the API with the session of the browser rather than from the interface: the
     * identifier is a uuid the sidebar never shows, and a test needs it to play the visitor.
     */
    public String bookingLinkPublicId(String name) {
        Object id = page.evaluate("""
            async name => {
              const token = JSON.parse(sessionStorage.getItem('tokenSet') || '{}').access_token;
              const response = await fetch(window.CALENDAR_BASE_URL + '/api/booking-links', {
                headers: { Authorization: 'Bearer ' + token } });
              const links = await response.json();
              const found = links.find(link => link.name === name);
              return found ? found.publicId : null;
            }""", name);
        if (id == null) {
            throw new AssertionError("No booking link named " + name);
        }
        return String.valueOf(id);
    }

    /** Every booking link of the user, straight from the API, for the assertions on persistence. */
    public String bookingLinksJson() {
        return String.valueOf(page.evaluate("""
            async () => {
              const token = JSON.parse(sessionStorage.getItem('tokenSet') || '{}').access_token;
              const response = await fetch(window.CALENDAR_BASE_URL + '/api/booking-links', {
                headers: { Authorization: 'Bearer ' + token } });
              return await response.text();
            }"""));
    }

    /**
     * The calendars the creation form offers as a destination, which is what says whether a
     * delegated calendar is really writable from this session.
     */
    public List<String> calendarNamesInForm() {
        EventFormModal form = createEvent().expand();
        List<String> names = form.calendarOptions();
        form.cancel();
        return names;
    }

    public SettingsPage openSettings() {
        page.getByLabel("User profile").click();
        page.getByText("Settings").last().click();
        return new SettingsPage(page).waitUntilOpen();
    }

    public void logout() {
        page.getByLabel("User profile").click();
        page.getByText("Logout").last().click();
    }

    public String loggedInUser() {
        page.getByLabel("User profile").click();
        String menu = page.locator(".MuiPopover-root").innerText();
        page.keyboard().press("Escape");
        return menu;
    }

    /** Searches for events. Opens the search bar first when it is not already showing. */
    public CalendarPage search(String keywords) {
        Locator input = page.getByPlaceholder("Search");
        if (input.count() == 0) {
            page.getByLabel("Search for events or calendars").click();
            input.first().waitFor();
        }
        input.first().fill(keywords);
        input.first().press("Enter");
        page.waitForTimeout(1500);
        return this;
    }

    /** Empties the search field, which takes the user back to the calendar. */
    public CalendarPage clearSearch() {
        Locator input = page.getByPlaceholder("Search");
        if (input.count() > 0) {
            input.first().fill("");
            input.first().press("Enter");
            page.waitForTimeout(1200);
        }
        if (page.locator(".fc-view-harness").count() == 0) {
            // emptying the field is not always enough: the logo takes the user home, which is
            // the gesture left once the search toggle has given way to the search bar
            page.getByLabel("Calendar", new Page.GetByLabelOptions().setExact(true)).first().click();
            page.locator(".fc-view-harness").waitFor();
        }
        return this;
    }

    /**
     * Searches until the expected text shows up. Events are indexed asynchronously, so a query
     * fired right after a creation legitimately comes back empty the first time.
     */
    public CalendarPage searchUntil(String keywords, String expected) {
        org.awaitility.Awaitility.await()
            .atMost(java.time.Duration.ofSeconds(60))
            .pollInterval(java.time.Duration.ofSeconds(3))
            .until(() -> {
                search(keywords);
                return page.getByText(expected).count() > 0;
            });
        return this;
    }

    public String searchResults() {
        return page.locator("body").innerText();
    }
}
