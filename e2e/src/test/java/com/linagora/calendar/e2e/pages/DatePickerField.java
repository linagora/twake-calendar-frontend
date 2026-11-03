package com.linagora.calendar.e2e.pages;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.regex.Pattern;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.TimeoutError;

/**
 * Drives a date field of the application.
 *
 * <p>Those fields are read only by design — typing is disabled, the value can only be set
 * through the calendar popup — so a test cannot simply fill them. The popup is also slow to
 * mount and does not always react to the first click, hence the retries: they make the helper
 * dull rather than flaky, which is what a test suite needs from it.
 */
class DatePickerField {
    private static final DateTimeFormatter MONTH_LABEL =
        DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH);
    private static final int ATTEMPTS = 4;

    static void pick(Page page, Locator field, LocalDate date) {
        // checking a radio re-renders the panel around this field: let it settle before reading
        field.waitFor(new Locator.WaitForOptions()
            .setState(com.microsoft.playwright.options.WaitForSelectorState.VISIBLE));
        String expected = CalendarPage.longDate(date);
        for (int attempt = 1; attempt <= ATTEMPTS; attempt++) {
            if (expected.equals(field.inputValue())) {
                return;
            }
            try {
                open(page, field);
                selectDay(page, date);
            } catch (TimeoutError e) {
                if (attempt == ATTEMPTS) {
                    throw e;
                }
                page.keyboard().press("Escape");
                page.waitForTimeout(300);
                continue;
            }
            for (int guard = 0; guard < 40 && !expected.equals(field.inputValue()); guard++) {
                page.waitForTimeout(100);
            }
        }
        if (!expected.equals(field.inputValue())) {
            throw new AssertionError("Could not set the date field to " + expected
                + ", it still reads " + field.inputValue());
        }
    }

    private static void open(Page page, Locator field) {
        field.click();
        picker(page).waitFor(new Locator.WaitForOptions().setTimeout(5_000));
    }

    private static void selectDay(Page page, LocalDate date) {
        Locator picker = picker(page);
        Locator header = picker.locator(".MuiPickersCalendarHeader-label");
        YearMonth target = YearMonth.from(date);
        for (int guard = 0; guard < 36; guard++) {
            YearMonth displayed = YearMonth.parse(header.innerText().trim(), MONTH_LABEL);
            if (displayed.equals(target)) {
                break;
            }
            picker.getByLabel(displayed.isBefore(target) ? "Next month" : "Previous month").click();
            page.waitForTimeout(120);
        }
        picker.locator("button.MuiPickerDay-root:not(.MuiPickerDay-dayOutsideMonth)")
            .filter(new Locator.FilterOptions().setHasText(Pattern.compile("^" + date.getDayOfMonth() + "$")))
            .first()
            .click(new Locator.ClickOptions().setTimeout(5_000));
    }

    private static Locator picker(Page page) {
        return page.locator(".MuiPickerPopper-root").last();
    }
}
