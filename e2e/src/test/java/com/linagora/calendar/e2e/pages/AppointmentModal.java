package com.linagora.calendar.e2e.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;

/**
 * The "appointment schedule" modal of the private application: the form behind a booking link.
 *
 * <p>Weekly availability is one row per day, each holding a checkbox and a pair of time fields
 * carrying a {@code start-time-MON-0} style test id. The checkbox has no name of its own, so it
 * is reached from the time field of its own row rather than by position in the form.
 */
public class AppointmentModal {
    private static final String[] DAYS = {"MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"};

    private final Page page;

    AppointmentModal(Page page) {
        this.page = page;
    }

    AppointmentModal waitUntilOpen() {
        page.getByPlaceholder("Schedule name").waitFor();
        return this;
    }

    public AppointmentModal name(String name) {
        page.getByPlaceholder("Schedule name").fill(name);
        return this;
    }

    public String name() {
        return page.getByPlaceholder("Schedule name").inputValue();
    }

    /** One of "15 minutes", "30 minutes", "45 minutes", "1 hour", "2 hours". */
    public AppointmentModal duration(String label) {
        durationSelect().click();
        page.locator("li[role=option]")
            .filter(new Locator.FilterOptions().setHasText(label)).first().click();
        page.locator("li[role=option]").first()
            .waitFor(new Locator.WaitForOptions()
                .setState(com.microsoft.playwright.options.WaitForSelectorState.DETACHED));
        return this;
    }

    public String duration() {
        return durationSelect().innerText().trim();
    }

    /** The choices the duration picker offers, in the order it offers them. */
    public java.util.List<String> durationOptions() {
        durationSelect().click();
        page.locator("li[role=option]").first().waitFor();
        java.util.List<String> options = page.locator("li[role=option]").allInnerTexts()
            .stream().map(String::trim).toList();
        page.keyboard().press("Escape");
        return options;
    }

    private Locator durationSelect() {
        return page.locator("[role=dialog]").last()
            .locator("[role=combobox]").first();
    }

    public AppointmentModal availableOn(String day, String from, String to) {
        if (!dayCheckbox(day).isChecked()) {
            dayCheckbox(day).check();
        }
        startOf(day).fill(from);
        endOf(day).fill(to);
        return this;
    }

    public AppointmentModal unavailableOn(String day) {
        if (dayCheckbox(day).isChecked()) {
            dayCheckbox(day).uncheck();
        }
        return this;
    }

    /** Leaves only the given days bookable, so a test knows exactly which slots to expect. */
    public AppointmentModal onlyAvailableOn(String day, String from, String to) {
        for (String other : DAYS) {
            if (!other.equals(day)) {
                unavailableOn(other);
            }
        }
        return availableOn(day, from, to);
    }

    public boolean isAvailableOn(String day) {
        return dayCheckbox(day).isChecked();
    }

    public String startTimeOn(String day) {
        return startOf(day).inputValue();
    }

    public String endTimeOn(String day) {
        return endOf(day).inputValue();
    }

    /** Replicates the hours of a day onto every other one. */
    public AppointmentModal copyToAllDays(String day) {
        actionOn(day, "copy-slot").click();
        return this;
    }

    public AppointmentModal addSlotOn(String day) {
        actionOn(day, "add-slot").click();
        return this;
    }

    /**
     * The "Show me as" choice: whether the events this schedule creates make the owner busy.
     * It defaults to Busy: Free would let the very same slot be booked more than once.
     */
    public AppointmentModal showMeAs(String label) {
        Locator combo = page.locator(
            "xpath=//*[normalize-space(text())='Show me as']/following::*[@role='combobox'][1]");
        combo.click();
        page.locator("li[role=option]")
            .filter(new Locator.FilterOptions().setHasText(label)).first().click();
        page.locator("li[role=option]").first()
            .waitFor(new Locator.WaitForOptions()
                .setState(com.microsoft.playwright.options.WaitForSelectorState.DETACHED));
        return this;
    }

    public String showMeAs() {
        return page.locator(
            "xpath=//*[normalize-space(text())='Show me as']/following::*[@role='combobox'][1]")
            .innerText().trim();
    }

    /** Reveals guests, description, location, calendar and visibility. */
    public AppointmentModal moreOptions() {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("More options")).click();
        page.getByPlaceholder("Add description").waitFor();
        return this;
    }

    public AppointmentModal description(String description) {
        page.getByPlaceholder("Add description").fill(description);
        return this;
    }

    public AppointmentModal location(String location) {
        page.getByPlaceholder("Add location").fill(location);
        return this;
    }

    /** The switch that publishes or retires a schedule. */
    public Locator activeSwitch() {
        return page.locator("[role=dialog]").last()
            .locator("input[type=checkbox][aria-label*='appointment schedule']");
    }

    public AppointmentModal deactivate() {
        Locator toggle = activeSwitch();
        if (toggle.isChecked()) {
            toggle.uncheck();
        }
        return this;
    }

    public AppointmentModal activate() {
        Locator toggle = activeSwitch();
        if (!toggle.isChecked()) {
            toggle.check();
        }
        return this;
    }

    public Locator saveButton() {
        return page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Save"));
    }

    public void save() {
        saveButton().click();
        page.getByPlaceholder("Schedule name").waitFor(new Locator.WaitForOptions()
            .setState(com.microsoft.playwright.options.WaitForSelectorState.DETACHED));
    }

    /** Clicks Save without expecting the modal to close: for the scenarios it must refuse. */
    public AppointmentModal saveExpectingRefusal() {
        saveButton().click();
        return this;
    }

    public boolean isOpen() {
        return page.getByPlaceholder("Schedule name").count() > 0;
    }

    public String text() {
        return page.locator("[role=dialog]").last().innerText();
    }

    public void close() {
        page.getByLabel("close").last().click();
    }

    private Locator startOf(String day) {
        return page.getByTestId("start-time-" + day + "-0");
    }

    private Locator endOf(String day) {
        return page.getByTestId("end-time-" + day + "-0");
    }

    /**
     * The add or copy button of a day. The rows share their markup and only the time fields
     * carry an identifier, so the button is the first one of its kind after that field.
     */
    private Locator actionOn(String day, String action) {
        return page.locator("xpath=//input[@data-testid='start-time-" + day
            + "-0']/following::button[@aria-label='" + action + "'][1]");
    }

    private Locator dayCheckbox(String day) {
        return page.locator("xpath=//input[@data-testid='start-time-" + day
            + "-0']/preceding::input[@type='checkbox'][1]");
    }
}
