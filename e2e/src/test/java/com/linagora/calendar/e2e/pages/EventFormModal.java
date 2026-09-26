package com.linagora.calendar.e2e.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;

/**
 * The create / update event modal.
 *
 * <p>It opens collapsed, showing only a handful of fields; {@link #expand()} reveals the dates,
 * description, location, notification and visibility ones.
 */
public class EventFormModal {
    private final Page page;

    public EventFormModal(Page page) {
        this.page = page;
    }

    EventFormModal waitUntilOpen() {
        titleInput().waitFor();
        return this;
    }

    /** Whether the form showed up within the budget, without failing the test if it did not. */
    boolean openedWithin(double timeoutMs) {
        try {
            titleInput().waitFor(new Locator.WaitForOptions().setTimeout(timeoutMs));
            return true;
        } catch (com.microsoft.playwright.TimeoutError e) {
            return false;
        }
    }

    boolean isOnScreen() {
        return page.locator("[role=dialog]").count() > 0;
    }

    private Locator dialog() {
        return page.locator("[role=dialog]").last();
    }

    private Locator titleInput() {
        return page.getByLabel("Title").first();
    }

    public EventFormModal title(String title) {
        titleInput().fill(title);
        return this;
    }

    public String title() {
        return titleInput().inputValue();
    }

    /** Reveals every field of the form. */
    public EventFormModal expand() {
        page.getByLabel("expand").click();
        page.getByLabel("Start Date").waitFor();
        // The compact and the expanded layout declare the same test ids. While the swap is in
        // flight both are in the page, and a fill started against the one on its way out lands
        // wherever Playwright retries it. Wait for the swap to settle -- never for a field to
        // exist: an all day event has no time input at all, and would wait for ever.
        page.waitForFunction(
            "() => document.querySelectorAll('[data-testid=\\'start-time-input\\']').length <= 1");
        return this;
    }

    /** Leaves the full screen layout for the compact modal, keeping the form open. */
    public EventFormModal collapse() {
        page.getByLabel("show less").click();
        page.getByLabel("expand").waitFor();
        return this;
    }

    public EventFormModal startTime(String hhmm) {
        return fillTime("start-time-input", hhmm);
    }

    public EventFormModal endTime(String hhmm) {
        return fillTime("end-time-input", hhmm);
    }

    /**
     * Fills a time field and checks what landed in it. A fill that misses its target is not
     * only wrong here, it corrupts whatever field did receive it, and the test then fails much
     * later on an unrelated assertion. Better to see it at the source.
     */
    private EventFormModal fillTime(String testId, String hhmm) {
        Locator field = page.getByTestId(testId);
        String titleBefore = titleInput().inputValue();
        // focus rather than click: clicking one of these fields drops its list of times over
        // the form, and whatever comes next then lands on the list instead of the form
        field.focus();
        // The form puts the caret back in its title on the render that follows expanding. A
        // fill racing that render inserts its text wherever the caret ended up -- in practice
        // in the title, while the time field quietly keeps its default. Give the caret a moment
        // to settle; the check below is what actually guarantees the outcome.
        try {
            page.waitForFunction(
                "id => document.activeElement && document.activeElement.getAttribute('data-testid') === id",
                testId, new Page.WaitForFunctionOptions().setTimeout(3_000));
        } catch (com.microsoft.playwright.TimeoutError ignored) {
            // fall through: fill, then check
        }
        field.fill(hhmm);

        // A field that holds something else may simply have normalised what it was given, which
        // is its right and which some tests are precisely about. The telling sign of a misplaced
        // fill is the title having changed: put it back and aim again.
        if (!titleBefore.equals(titleInput().inputValue())) {
            titleInput().fill(titleBefore);
            field.focus();
            field.fill(hhmm);
        }
        if (!titleBefore.equals(titleInput().inputValue())) {
            throw new AssertionError("Filling " + testId + " with " + hhmm
                + " keeps landing in the title, which now reads " + titleInput().inputValue());
        }
        return this;
    }

    public String startTime() {
        return page.getByTestId("start-time-input").inputValue();
    }

    public String endTime() {
        return page.getByTestId("end-time-input").inputValue();
    }

    /** The date fields are read only, so this drives the picker the way a user would. */
    public EventFormModal startDate(java.time.LocalDate date) {
        DatePickerField.pick(page, page.getByTestId("start-date-input"), date);
        return this;
    }

    public String startDate() {
        return page.getByTestId("start-date-input").inputValue();
    }

    public EventFormModal endDate(java.time.LocalDate date) {
        DatePickerField.pick(page, page.getByTestId("end-date-input"), date);
        return this;
    }

    /**
     * The repeat panel, enabling the recurrence if it is not on yet.
     *
     * <p>Reads the toggle, never the visibility of the panel: on an event that already repeats,
     * the panel can lag a render behind, and acting on that would switch the recurrence *off*.
     */
    public RecurrenceSection repeat() {
        Locator toggle = repeatToggle();
        if (!toggle.isChecked()) {
            toggle.check();
        }
        page.getByTestId("repeat-interval").waitFor();
        // the panel arrives in pieces: the end options land after the interval, and a caller
        // reaching for them straight away would find nothing. Wait for the radios, which are
        // always rendered -- never for the end date field, which only exists once the "on a
        // date" option is the one selected, and which endsOn() waits for by itself.
        try {
            page.locator("input[type=radio][value=never]").waitFor();
            page.locator("input[type=radio][value=on]").waitFor();
        } catch (com.microsoft.playwright.TimeoutError e) {
            throw new AssertionError("The repeat panel never finished rendering its end options."
                + " Radios: " + page.locator("input[type=radio]").count()
                + ". The dialog reads:\n" + text(), e);
        }
        return new RecurrenceSection(page);
    }

    public EventFormModal doesNotRepeat() {
        page.getByLabel("Repeat", new Page.GetByLabelOptions().setExact(true)).uncheck();
        return this;
    }

    public Locator repeatToggle() {
        return page.getByLabel("Repeat", new Page.GetByLabelOptions().setExact(true));
    }

    /** The destination calendar picker of the form -- scoped to the modal, the menubar logo
     * carries the same accessible name. */
    public Locator calendarSelect() {
        return dialog().getByLabel("Calendar", new Locator.GetByLabelOptions().setExact(true));
    }

    /** The calendars the picker offers as a destination. */
    public java.util.List<String> calendarOptions() {
        Locator select = calendarSelect();
        select.scrollIntoViewIfNeeded();
        select.click();
        page.locator("li[role=option]").first().waitFor();
        java.util.List<String> options = page.locator("li[role=option]").allInnerTexts()
            .stream().map(String::trim).toList();
        page.keyboard().press("Escape");
        awaitNoOverlay();
        return options;
    }

    /** Moves the event to another calendar, by its name. */
    public EventFormModal calendar(String calendarName) {
        Locator select = calendarSelect();
        select.scrollIntoViewIfNeeded();
        select.click();
        Locator options = page.locator("li[role=option]");
        options.first().waitFor();
        Locator wanted = options.filter(new Locator.FilterOptions().setHasText(calendarName));
        if (wanted.count() == 0) {
            throw new AssertionError("No calendar named " + calendarName
                + " in the picker, which offers " + options.allInnerTexts());
        }
        wanted.first().click();
        // the option list going away is what says the choice was taken
        awaitNoOverlay();
        return this;
    }

    public String description() {
        return page.getByLabel("Description").inputValue();
    }

    public String location() {
        return page.getByLabel("Location").inputValue();
    }

    /** Whether the form actually offers to move the event to another calendar. */
    public boolean canMoveToAnotherCalendar() {
        Locator select = calendarSelect();
        if (select.count() == 0) {
            return false;
        }
        String classes = String.valueOf(select.first().getAttribute("class"));
        return !classes.contains("Mui-disabled")
            && !"true".equals(select.first().getAttribute("aria-disabled"));
    }

    public EventFormModal timezone(String timezone) {
        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                // fill() does not reach the MUI autocomplete filter, its value is controlled:
                // type it out instead
                timezoneInput().click();
                timezoneInput().fill("");
                timezoneInput().pressSequentially(timezone,
                    new Locator.PressSequentiallyOptions().setDelay(40));
                // wait for the option that matches what was typed, never for the first one to
                // hand: under load the list is still showing the previous filter for a moment,
                // and clicking it picks a zone nobody asked for
                Locator wanted = page.locator("li[role=option]")
                    .filter(new Locator.FilterOptions().setHasText(timezone));
                wanted.first().waitFor(new Locator.WaitForOptions().setTimeout(15_000));
                wanted.first().click();
                awaitNoOverlay();
                if (timezoneInput().inputValue().contains(timezone)) {
                    return this;
                }
            } catch (com.microsoft.playwright.TimeoutError retry) {
                // the list never settled on this attempt: type it again from scratch
            }
        }
        throw new AssertionError("Could not set the timezone to " + timezone
            + ", the field still reads " + timezoneInput().inputValue());
    }

    /**
     * What the timezone picker offers for a query.
     *
     * <p>Types the query and waits for the list to be filtered by it, rather than for any option
     * at all: the MUI autocomplete answers keystroke by keystroke, and a list that has not caught
     * up yet still holds the whole world.
     */
    public java.util.List<String> timezoneOptions(String query) {
        for (int attempt = 1; attempt <= 3; attempt++) {
            timezoneInput().click();
            timezoneInput().fill("");
            timezoneInput().pressSequentially(query,
                new Locator.PressSequentiallyOptions().setDelay(40));
            Locator options = page.locator("li[role=option]");
            try {
                options.filter(new Locator.FilterOptions().setHasText(query)).first()
                    .waitFor(new Locator.WaitForOptions().setTimeout(15_000));
            } catch (com.microsoft.playwright.TimeoutError notYet) {
                continue;
            }
            java.util.List<String> offered = options.allInnerTexts().stream()
                .map(String::trim).toList();
            if (offered.stream().allMatch(option ->
                    option.toLowerCase().contains(query.toLowerCase()))) {
                return offered;
            }
        }
        throw new AssertionError("The timezone list never settled on " + query
            + ", it still offers " + page.locator("li[role=option]").count() + " options");
    }

    /** The timezone field itself, for the assertions that watch it settle. */
    public Locator timezoneField() {
        return timezoneInput();
    }

    /**
     * Waits for the option list the last interaction opened to be gone. Never presses Escape:
     * one press too many closes the modal itself.
     */
    private void awaitNoOverlay() {
        for (int guard = 0; guard < 30 && page.locator("[role=listbox]").count() > 0; guard++) {
            page.waitForTimeout(100);
        }
    }

    public String timezone() {
        return timezoneInput().inputValue();
    }

    private Locator timezoneInput() {
        return dialog().getByPlaceholder("Select timezone");
    }

    public EventFormModal allDay() {
        page.getByLabel("All day").check();
        return this;
    }

    public EventFormModal notAllDay() {
        page.getByLabel("All day").uncheck();
        return this;
    }

    public EventFormModal description(String description) {
        page.getByLabel("Description").fill(description);
        return this;
    }

    public EventFormModal location(String location) {
        page.getByLabel("Location").fill(location);
        return this;
    }

    /**
     * Types an email in the guest picker and validates it.
     *
     * <p>Typed rather than filled: the picker is a controlled MUI autocomplete, and a fill()
     * does not always reach its filter. The result is checked, and retried once, because a
     * guest silently dropped turns into a puzzling failure three assertions later.
     */
    public EventFormModal addGuest(String email) {
        for (int attempt = 1; attempt <= 3; attempt++) {
            Locator guests = page.getByPlaceholder("Add participants");
            guests.click();
            guests.fill("");
            guests.pressSequentially(email, new Locator.PressSequentiallyOptions().setDelay(30));
            page.waitForTimeout(400);
            guests.press("Enter");
            page.waitForTimeout(400);
            if (text().contains(email)) {
                return this;
            }
        }
        throw new AssertionError("Could not add " + email + " as a guest");
    }

    /**
     * The "Show me as" choice of the event: whether it makes its owner busy for the others.
     * That is what free/busy reads, so it is the lever behind most availability scenarios.
     */
    public EventFormModal showMeAs(String label) {
        Locator combo = page.locator(
            "xpath=//*[normalize-space(text())='Show me as']/following::*[@role='combobox'][1]");
        combo.scrollIntoViewIfNeeded();
        combo.click();
        page.locator("li[role=option]")
            .filter(new Locator.FilterOptions().setHasText(label)).first().click();
        awaitNoOverlay();
        return this;
    }

    public String showMeAs() {
        return page.locator(
            "xpath=//*[normalize-space(text())='Show me as']/following::*[@role='combobox'][1]")
            .innerText().trim();
    }

    // -------------------------------------------------------------- availability

    /**
     * What the form says about somebody's availability, read from the icon on their chip.
     *
     * <p>Empty when the form shows nothing: the indicator is only rendered for busy and for the
     * two flavours of unknown, never for a guest who is free, so an empty answer means "nothing
     * stands in the way" rather than "not computed yet".
     *
     * <p>Availability is only ever computed for attendees already on the event, so this says
     * nothing while an event is being created -- reopen it for edition first.
     */
    public String availabilityOf(String email) {
        Locator icon = chipOf(email).locator("svg[aria-label]");
        return icon.count() == 0 ? "" : String.valueOf(icon.first().getAttribute("aria-label"));
    }

    /**
     * Waits for the availability of somebody to reach the given answer, and is the assertion
     * itself: reading the value again afterwards is unreliable, since the form clears every
     * status and recomputes it whenever the times change, so a second look lands mid cycle.
     */
    public EventFormModal awaitAvailabilityOf(String email, String expected, String because) {
        try {
            page.waitForFunction("""
                args => {
                  const chip = Array.from(document.querySelectorAll('[role=dialog] .MuiChip-root'))
                    .find(candidate => (candidate.innerText || '').includes(args.email));
                  if (!chip) return false;
                  const icon = chip.querySelector('svg[aria-label]');
                  return (icon ? icon.getAttribute('aria-label') : '') === args.expected;
                }""",
                java.util.Map.of("email", email, "expected", expected),
                new Page.WaitForFunctionOptions().setTimeout(45_000));
        } catch (com.microsoft.playwright.TimeoutError e) {
            throw new AssertionError(because + ". The form says \"" + availabilityOf(email)
                + "\" about " + email + " where \"" + expected + "\" was expected", e);
        }
        return this;
    }

    public Locator chipOf(String email) {
        return dialog().locator(".MuiChip-root")
            .filter(new Locator.FilterOptions().setHasText(email)).first();
    }

    public boolean hasGuest(String email) {
        return dialog().locator(".MuiChip-root")
            .filter(new Locator.FilterOptions().setHasText(email)).count() > 0;
    }

    // ----------------------------------------------------------------- resources

    /** Books a resource on the event, from the dedicated field of the expanded form. */
    public EventFormModal addResource(String name) {
        Locator search = resourceSearch();
        search.click();
        search.fill("");
        search.pressSequentially(name, new Locator.PressSequentiallyOptions().setDelay(30));
        Locator wanted = page.locator("li[role=option]")
            .filter(new Locator.FilterOptions().setHasText(name));
        wanted.first().waitFor(new Locator.WaitForOptions().setTimeout(20_000));
        wanted.first().click();
        awaitNoOverlay();
        return this;
    }

    /** What the resource field offers for a search, which is what says the filter works. */
    public java.util.List<String> resourceOptions(String query) {
        Locator search = resourceSearch();
        search.click();
        search.fill("");
        search.pressSequentially(query, new Locator.PressSequentiallyOptions().setDelay(30));
        page.waitForTimeout(2500);
        java.util.List<String> options = page.locator("li[role=option]").allInnerTexts()
            .stream().map(String::trim).toList();
        page.keyboard().press("Escape");
        return options;
    }

    public Locator resourceSearch() {
        return dialog().getByPlaceholder("Search by name");
    }

    /**
     * Waits for the availability shown on the chip of a booked resource, found by its name as
     * a guest is by their email: the indicator is the same, only its wording differs.
     */
    public EventFormModal awaitAvailabilityOfResource(String name, String expected, String because) {
        return awaitAvailabilityOf(name, expected, because);
    }

    /** Types a guest without validating, to cover what happens when the field loses focus. */
    public EventFormModal typeGuest(String email) {
        Locator guests = page.getByPlaceholder("Add participants");
        guests.click();
        guests.pressSequentially(email, new Locator.PressSequentiallyOptions().setDelay(30));
        return this;
    }

    /** Takes a guest off the list by clicking the delete control of their chip. */
    public EventFormModal removeGuest(String email) {
        dialog().locator(".MuiChip-root")
            .filter(new Locator.FilterOptions().setHasText(email))
            .first()
            .locator("svg, button")
            .last()
            .click();
        page.waitForTimeout(600);
        return this;
    }

    public EventFormModal addVideoConference() {
        dialog().getByText("Add Visio conference").last().click();
        return this;
    }

    /**
     * Picks the reminder whose label holds the given text, "10 minutes" for instance.
     *
     * <p>While the option list is open MUI marks the rest of the application `aria-hidden`, so
     * the buttons of the modal vanish from the accessibility tree and nothing else can be
     * clicked. The list must therefore be properly closed before handing back.
     */
    public EventFormModal notification(String labelContains) {
        notificationSelect().click();
        page.getByRole(AriaRole.OPTION)
            .filter(new Locator.FilterOptions().setHasText(labelContains))
            .first()
            .click();
        closeOptionList();
        return this;
    }

    public String notification() {
        return notificationSelect().innerText().trim();
    }

    private Locator notificationSelect() {
        return dialog().getByRole(AriaRole.COMBOBOX)
            .filter(new Locator.FilterOptions()
                .setHasText(java.util.regex.Pattern.compile("notification|before", java.util.regex.Pattern.CASE_INSENSITIVE)))
            .last();
    }

    /**
     * Closes a lingering option list, and makes sure it did not take the modal with it.
     *
     * <p>MUI keeps the list mounted through its closing transition, so presence is not the
     * question: visibility is. And the modal is recognised by its Save button rather than by a
     * title field, because the personal settings form has no title.
     */
    private void closeOptionList() {
        Locator list = page.locator("[role=listbox]");
        for (int guard = 0; guard < 30 && isOptionListShowing(list); guard++) {
            page.waitForTimeout(100);
        }
        if (isOptionListShowing(list)) {
            page.keyboard().press("Escape");
            page.waitForTimeout(400);
        }
        if (saveButton().count() == 0) {
            throw new AssertionError("Closing the option list closed the whole modal");
        }
    }

    private boolean isOptionListShowing(Locator list) {
        return list.count() > 0 && list.last().isVisible();
    }

    public Locator saveButton() {
        return page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Save").setExact(true)).last();
    }

    public void save() {
        saveButton().click();
        titleInput().waitFor(new Locator.WaitForOptions()
            .setState(com.microsoft.playwright.options.WaitForSelectorState.DETACHED));
    }

    /**
     * Saves an event that belongs to a series: the scope dialog comes up first, and the caller
     * says whether the change targets the clicked occurrence or all of them.
     */
    public void save(Scope scope) {
        saveButton().click();
        ScopeDialog dialog = ScopeDialog.waitFor(page);
        if (scope == Scope.THIS_EVENT) {
            dialog.thisEvent();
        } else {
            dialog.allEvents();
        }
        titleInput().waitFor(new Locator.WaitForOptions()
            .setState(com.microsoft.playwright.options.WaitForSelectorState.DETACHED));
    }

    public enum Scope {
        THIS_EVENT,
        ALL_EVENTS
    }

    /** Submits without waiting for the modal to close: for the cases where it must not. */
    public EventFormModal trySave() {
        saveButton().click();
        return this;
    }

    public void cancel() {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Cancel").setExact(true)).last().click();
    }

    public void close() {
        page.getByLabel("close").click();
    }

    public boolean isOpen() {
        return titleInput().count() > 0 && titleInput().isVisible();
    }

    public String text() {
        return dialog().innerText();
    }
}
