package com.linagora.calendar.e2e.pages;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import com.microsoft.playwright.options.WaitForSelectorState;

/**
 * The repeat panel of the expanded event form: interval, frequency, weekdays and the three
 * ways a series can end.
 */
public class RecurrenceSection {
    public static final String DAILY = "Day(s)";
    public static final String WEEKLY = "Week(s)";
    public static final String MONTHLY = "Month(s)";
    public static final String YEARLY = "Year(s)";

    private static final Pattern ANY_FREQUENCY = Pattern.compile("Day\\(s\\)|Week\\(s\\)|Month\\(s\\)|Year\\(s\\)");

    private final Page page;

    RecurrenceSection(Page page) {
        this.page = page;
    }

    public RecurrenceSection every(int interval) {
        return fillKeepingTheTitle(intervalInput(), String.valueOf(interval));
    }

    /**
     * Turning the recurrence on renders this section and hands the focus back to the title of
     * the event: a fill racing that render types into the title. The value itself is not
     * checked, the field being entitled to normalise it -- some tests are about exactly that.
     */
    private RecurrenceSection fillKeepingTheTitle(Locator field, String value) {
        Locator title = page.getByLabel("Title").first();
        String before = title.inputValue();
        field.fill(value);
        if (!before.equals(title.inputValue())) {
            title.fill(before);
            field.fill(value);
        }
        if (!before.equals(title.inputValue())) {
            throw new AssertionError("Filling the recurrence with " + value
                + " keeps landing in the title, which now reads " + title.inputValue());
        }
        return this;
    }

    public Locator intervalInput() {
        return page.getByTestId("repeat-interval");
    }

    /** One of {@link #DAILY}, {@link #WEEKLY}, {@link #MONTHLY}, {@link #YEARLY}. */
    public RecurrenceSection frequency(String frequency) {
        frequencySelect().click();
        page.getByRole(AriaRole.OPTION, new Page.GetByRoleOptions().setName(frequency).setExact(true)).click();
        return this;
    }

    public String frequency() {
        return frequencySelect().innerText().trim();
    }

    private Locator frequencySelect() {
        return page.getByRole(AriaRole.COMBOBOX)
            .filter(new Locator.FilterOptions().setHasText(ANY_FREQUENCY))
            .last();
    }

    /** Weekdays as iCalendar codes: MO, TU, WE, TH, FR, SA, SU. */
    public RecurrenceSection onWeekdays(String... weekdays) {
        List.of(weekdays).forEach(day -> weekday(day).click());
        return this;
    }

    public Locator weekday(String icalDay) {
        return page.getByLabel(icalDay, new Page.GetByLabelOptions().setExact(true));
    }

    /**
     * The weekday toggles carry no class, no aria-pressed: their state only shows through the
     * emotion generated background, so that is what has to be read.
     */
    public boolean isWeekdaySelected(String icalDay) {
        String background = String.valueOf(weekday(icalDay)
            .evaluate("(button) => getComputedStyle(button).backgroundColor"));
        return !background.contains("rgba(0, 0, 0, 0)") && !"transparent".equals(background);
    }

    /** Leaves exactly the given weekdays ticked, in that order, which BYDAY follows. */
    public RecurrenceSection onlyWeekdays(String... icalDays) {
        List.of("MO", "TU", "WE", "TH", "FR", "SA", "SU").forEach(day -> {
            if (isWeekdaySelected(day)) {
                weekday(day).click();
            }
        });
        List.of(icalDays).forEach(day -> weekday(day).click());
        return this;
    }

    /** Never ends. */
    public RecurrenceSection endsNever() {
        page.locator("input[type=radio][value=never]").check();
        return this;
    }

    public RecurrenceSection endsAfter(int occurrences) {
        page.locator("input[type=radio][value=after]").check();
        fillKeepingTheTitle(page.getByTestId("occurrences-input"), String.valueOf(occurrences));
        return this;
    }

    /**
     * Ends on the given date. The field is read only by design, so this drives the date picker
     * the way a user would: open it, walk to the right month, click the day.
     */
    public RecurrenceSection endsOn(LocalDate date) {
        // Selecting the option remounts the end of the panel: the field can be there when the
        // picker is opened and gone a render later. Aim again rather than fail on that race.
        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                page.locator("input[type=radio][value=on]").check();
                endDateInput().waitFor(new Locator.WaitForOptions().setTimeout(10_000));
                DatePickerField.pick(page, endDateInput(), date);
                return this;
            } catch (com.microsoft.playwright.TimeoutError retry) {
                page.keyboard().press("Escape");
            }
        }
        throw new AssertionError("The end date field never settled long enough to pick " + date);
    }

    /** Opens the end date picker and reports whether the given day can be picked at all. */
    public boolean canEndOn(LocalDate date) {
        page.locator("input[type=radio][value=on]").check();
        endDateInput().click();
        Locator picker = page.locator(".MuiPickerPopper-root").last();
        picker.waitFor();
        Locator header = picker.locator(".MuiPickersCalendarHeader-label");
        java.time.YearMonth target = java.time.YearMonth.from(date);
        for (int guard = 0; guard < 36; guard++) {
            java.time.YearMonth displayed = java.time.YearMonth.parse(header.innerText().trim(),
                DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH));
            if (displayed.equals(target)) {
                break;
            }
            Locator arrow = picker.getByLabel(displayed.isBefore(target) ? "Next month" : "Previous month");
            if (!arrow.isEnabled()) {
                // the picker refuses to walk past its minimum: the date is simply not offered
                page.keyboard().press("Escape");
                return false;
            }
            arrow.click();
            page.waitForTimeout(120);
        }
        Locator day = picker.locator("button.MuiPickerDay-root:not(.MuiPickerDay-dayOutsideMonth)")
            .filter(new Locator.FilterOptions()
                .setHasText(Pattern.compile("^" + date.getDayOfMonth() + "$")))
            .first();
        boolean enabled = day.count() > 0 && day.isEnabled();
        page.keyboard().press("Escape");
        return enabled;
    }

    public Locator endDateInput() {
        return page.getByTestId("event-repeat-end-date");
    }

    public Locator occurrencesInput() {
        return page.getByTestId("occurrences-input");
    }

    public boolean isVisible() {
        return intervalInput().count() > 0 && intervalInput().isVisible();
    }
}
