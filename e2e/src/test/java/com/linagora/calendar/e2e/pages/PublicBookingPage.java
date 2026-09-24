package com.linagora.calendar.e2e.pages;

import java.time.LocalDate;
import java.util.List;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;

/**
 * The booking page of the public application, as a visitor with no account sees it.
 *
 * <p>Served from {@code http://public}, a different origin from the private application: every
 * call it makes to the API is cross origin and unauthenticated, which is exactly the point of
 * exercising it here rather than trusting the private side.
 */
public class PublicBookingPage {
    /** Where the public application answers, as baked in the runtime configuration of both apps. */
    public static final String BASE_URL = "http://public";

    private final Page page;

    public PublicBookingPage(Page page) {
        this.page = page;
    }

    public static PublicBookingPage open(Page page, String publicId) {
        page.navigate(BASE_URL + "/booking/" + publicId);
        return new PublicBookingPage(page).waitUntilLoaded();
    }

    public PublicBookingPage waitUntilLoaded() {
        // either the schedule rendered, or the app is telling the visitor why it did not
        page.waitForFunction("""
            () => {
              const text = document.body.innerText;
              return document.querySelector('[aria-label="Next month"]')
                || /not found|not available|could not/i.test(text);
            }""");
        return this;
    }

    public String text() {
        return page.locator("body").innerText();
    }

    /** The times offered for the selected day, as the visitor reads them. */
    public List<String> slots() {
        return page.getByRole(AriaRole.BUTTON).allInnerTexts().stream()
            .map(String::trim)
            .filter(label -> label.matches("\\d{2}:\\d{2}"))
            .toList();
    }

    public PublicBookingPage selectDay(LocalDate day) {
        navigateToMonth(java.time.YearMonth.from(day));
        Locator cell = dayCell(day);
        if (Boolean.TRUE.equals(cell.isDisabled())) {
            throw new AssertionError(day + " is not open for booking. The days on offer that "
                + "month are " + bookableDays());
        }
        cell.click();
        return this;
    }

    private void navigateToMonth(java.time.YearMonth wanted) {
        // the picker opens on the current month: walk forward until the day is on screen,
        // rather than assuming a target within the next few days never crosses a month
        for (int guard = 0; guard < 12 && !displayedMonth().equals(wanted); guard++) {
            page.getByLabel("Next month").click();
            page.waitForTimeout(300);
        }
        if (!displayedMonth().equals(wanted)) {
            throw new AssertionError("The picker never reached " + wanted
                + ", it stopped on " + displayedMonth());
        }
    }

    /** A day of the picker. They are grid cells, not buttons: the month grid is a real grid. */
    private Locator dayCell(LocalDate day) {
        return page.getByRole(AriaRole.GRIDCELL, new Page.GetByRoleOptions()
            .setName(String.valueOf(day.getDayOfMonth())).setExact(true)).first();
    }

    /** The days of the displayed month a visitor may actually pick. */
    @SuppressWarnings("unchecked")
    public List<String> bookableDays() {
        return (List<String>) page.evaluate("""
            () => Array.from(document.querySelectorAll('[role=gridcell]'))
              .filter(cell => !cell.disabled)
              .map(cell => cell.innerText.trim())""");
    }

    public boolean isBookable(LocalDate day) {
        // one month is on screen at a time: without this walk the lookup would read the
        // same-numbered cell of the displayed month, which is disabled, for any day in
        // another month
        navigateToMonth(java.time.YearMonth.from(day));
        return !Boolean.TRUE.equals(dayCell(day).isDisabled());
    }

    /** The month the picker header names. */
    public java.time.YearMonth displayedMonth() {
        // month names only: a schedule called "Cancellable 1778" would otherwise read as one
        java.util.regex.Matcher matcher = java.util.regex.Pattern
            .compile("(January|February|March|April|May|June|July|August|September|October"
                + "|November|December)\\s+(\\d{4})")
            .matcher(page.locator("body").innerText());
        if (!matcher.find()) {
            throw new AssertionError("No month in the booking page header");
        }
        return java.time.YearMonth.parse(matcher.group(1) + " " + matcher.group(2),
            java.time.format.DateTimeFormatter.ofPattern("MMMM yyyy", java.util.Locale.ENGLISH));
    }

    public PublicBookingPage pickSlot(String hhmm) {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName(hhmm).setExact(true))
            .first().click();
        page.getByPlaceholder("Name").waitFor();
        return this;
    }

    /** Fills the visitor form and confirms. */
    public PublicBookingPage bookAs(String name, String email) {
        fillVisitor(name, email);
        confirm();
        return this;
    }

    public PublicBookingPage fillVisitor(String name, String email) {
        page.getByPlaceholder("Name").first().fill(name);
        page.getByPlaceholder("Email").first().fill(email);
        return this;
    }

    public PublicBookingPage confirm() {
        confirmButton().click();
        return this;
    }

    public Locator confirmButton() {
        return page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Confirm"));
    }

    /** Waits for the confirmation screen and returns what it tells the visitor. */
    public String successMessage() {
        page.getByText("Meeting created").waitFor(
            new Locator.WaitForOptions().setTimeout(30_000));
        return page.locator("body").innerText();
    }

    public boolean isConfirmed() {
        return page.getByText("Meeting created").count() > 0;
    }

    /** Cancels the booking that was just made, from the confirmation screen. */
    public PublicBookingPage cancelBooking() {
        // "Cancel your meeting" is the prompt, the button beneath it simply reads Cancel
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Cancel"))
            .last().click();
        page.getByText("Reservation cancelled").waitFor(
            new Locator.WaitForOptions().setTimeout(30_000));
        return this;
    }

    /** The confirmation URL the visitor can come back to, carrying its own token. */
    public String confirmationUrl() {
        return page.url();
    }
}
