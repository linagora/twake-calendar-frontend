package com.linagora.calendar.e2e.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import com.microsoft.playwright.options.WaitForSelectorState;

/** The calendar dialog: creating one, and the Settings, Access and Import tabs of an existing one. */
public class CalendarModal {
    private final Page page;

    CalendarModal(Page page) {
        this.page = page;
    }

    CalendarModal waitUntilOpen() {
        page.locator("[role=dialog]").last().waitFor();
        return this;
    }

    private Locator dialog() {
        return page.locator("[role=dialog]").last();
    }

    private Locator nameInput() {
        return page.getByLabel("Name", new Page.GetByLabelOptions().setExact(true));
    }

    public CalendarModal name(String name) {
        nameInput().fill(name);
        return this;
    }

    public String name() {
        return nameInput().inputValue();
    }

    /** One of Settings, Access, Import, Add new calendar. */
    public CalendarModal tab(String tab) {
        Locator target = page.getByRole(AriaRole.TAB, new Page.GetByRoleOptions().setName(tab));
        target.click();
        com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat(target)
            .hasAttribute("aria-selected", "true");
        return this;
    }

    public java.util.List<String> tabs() {
        return page.getByRole(AriaRole.TAB).allInnerTexts();
    }

    /** The preset colours, named as the colour radio group announces them. */
    private static final java.util.Map<String, String> PRESET_COLOR_NAMES = java.util.Map.of(
        "#D0ECDA", "Green",
        "#FAE3CE", "Orange",
        "#F5CFD0", "Red",
        "#AFCBEF", "Blue",
        "#E8E4F8", "Purple");

    /** Picks one of the preset colours, by its hexadecimal value. */
    public CalendarModal color(String hex) {
        page.getByRole(AriaRole.RADIO, new Page.GetByRoleOptions()
            .setName(PRESET_COLOR_NAMES.get(hex.toUpperCase())).setExact(true)).click();
        return this;
    }

    public CalendarModal customColor(String hex) {
        page.getByLabel("Select custom color").click();
        page.waitForTimeout(600);
        // the hex field carries neither label nor placeholder; once the picker is open it is
        // the last input on the page, already holding the current colour
        Locator hexInput = page.locator("input").last();
        hexInput.fill(hex);
        hexInput.press("Enter");
        page.waitForTimeout(600);
        // the picker sits over the dialog: confirm it so the Create button is reachable again
        Locator confirm = page.getByRole(AriaRole.BUTTON,
            new Page.GetByRoleOptions().setName(java.util.regex.Pattern.compile("^(Ok|OK|Apply|Save)$")));
        if (confirm.count() > 0) {
            confirm.last().click();
            page.waitForTimeout(500);
        }
        return this;
    }

    /** New events of this calendar are visible to All, or to You only. */
    public CalendarModal newEventsVisibleTo(String audience) {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName(audience).setExact(true))
            .last().click();
        return this;
    }

    /** One of the two buttons of the public visibility of the calendar, All or You. */
    public Locator visibilityOption(String audience) {
        return dialog().getByRole(AriaRole.BUTTON,
            new Locator.GetByRoleOptions().setName(audience).setExact(true));
    }

    /** Whether the Settings tab tells who the events of the calendar are visible to. */
    public boolean showsVisibility() {
        return dialog().getByText("New events created will be visible to:").count() > 0;
    }

    public String text() {
        return dialog().innerText();
    }

    // -------------------------------------------------------------- CalDAV access

    /** The CalDAV address of this calendar, as the Access tab shows it. */
    public String caldavUrl() {
        return dialog().getByLabel("CalDAV access", new Locator.GetByLabelOptions().setExact(true)).inputValue();
    }

    /** The address that opens the calendar without credentials, token included. */
    public String secretUrl() {
        Locator field = dialog().getByLabel("Secret URL", new Locator.GetByLabelOptions().setExact(true));
        // the tab fetches the address once open: until it answers, the field stands empty
        com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat(field)
            .hasValue(java.util.regex.Pattern.compile(".+"),
                new com.microsoft.playwright.assertions.LocatorAssertions.HasValueOptions().setTimeout(20_000));
        return field.inputValue();
    }

    /** Issues a new secret address, retiring the previous one. */
    public CalendarModal resetSecretUrl() {
        String before = secretUrl();
        dialog().getByRole(AriaRole.BUTTON,
            new Locator.GetByRoleOptions().setName("Reset").setExact(true)).click();
        page.waitForFunction("""
            previous => {
              const field = Array.from(document.querySelectorAll('input'))
                .find(input => input.getAttribute('aria-label') === 'Secret URL');
              return field && field.value && field.value !== previous;
            }""", before);
        return this;
    }

    /** Downloads the calendar as an iCalendar file and returns what it holds. */
    public String exportCalendar() {
        com.microsoft.playwright.Download download = page.waitForDownload(() ->
            dialog().getByRole(AriaRole.BUTTON,
                new Locator.GetByRoleOptions().setName("Export").setExact(true)).click());
        try (java.io.InputStream stream = download.createReadStream()) {
            return new String(stream.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
        } catch (java.io.IOException e) {
            throw new RuntimeException("Could not read the exported calendar", e);
        }
    }

    // ------------------------------------------------------------------ Access

    /**
     * Grants a right on this calendar to somebody, from the Access tab.
     *
     * <p>{@code right} is one of "View all events", "Editor" or "Administrator" -- the three the
     * product offers. The people field is a MUI autocomplete: it filters on what is typed rather
     * than on a value set at once, so the address is typed out and the suggestion picked.
     */
    public CalendarModal grantAccess(String email, String right) {
        Locator search = peopleSearch();
        search.click();
        search.fill("");
        search.pressSequentially(email, new Locator.PressSequentiallyOptions().setDelay(30));
        Locator suggestion = page.locator("li[role=option]")
            .filter(new Locator.FilterOptions().setHasText(email));
        suggestion.first().waitFor(new Locator.WaitForOptions().setTimeout(20_000));
        suggestion.first().click();
        setRightOf(email, right);
        return this;
    }

    /** Changes the right already granted to somebody. */
    public CalendarModal setRightOf(String email, String right) {
        Locator selector = accessRow(email).locator("[role=combobox]").first();
        if (right.equals(selector.innerText().trim())) {
            return this;
        }
        selector.click();
        page.locator("li[role=option]")
            .filter(new Locator.FilterOptions().setHasText(right)).first().click();
        page.locator("li[role=option]").first().waitFor(
            new Locator.WaitForOptions().setState(WaitForSelectorState.DETACHED));
        return this;
    }

    public String rightOf(String email) {
        return accessRow(email).locator("[role=combobox]").first().innerText().trim();
    }

    /** Takes a right back. */
    public CalendarModal revokeAccess(String email) {
        accessRow(email).getByLabel("remove").first().click();
        return this;
    }

    public boolean hasAccessRow(String email) {
        return accessRow(email).count() > 0;
    }

    /** The rights the picker offers, which say what the product can actually grant. */
    public java.util.List<String> accessRightOptions(String email) {
        Locator selector = accessRow(email).locator("[role=combobox]").first();
        selector.click();
        page.locator("li[role=option]").first().waitFor();
        java.util.List<String> options = page.locator("li[role=option]").allInnerTexts()
            .stream().map(String::trim).toList();
        page.keyboard().press("Escape");
        return options;
    }

    /** Whether the tab lets this user grant anything, or only look at what is granted. */
    public boolean canGrantAccess() {
        return dialog().getByText("Grant Access rights").count() > 0;
    }

    private Locator peopleSearch() {
        return dialog().getByPlaceholder("Start typing a name or email");
    }

    /**
     * The row of one grantee.
     *
     * <p>Anchored on the address, which the row prints on its own line under the display name:
     * the name is duplicated from the directory and the rows carry no identifier. The tab holds
     * a second rights selector, the one used to grant, so a locator that merely looks for a
     * selector near the address finds the wrong one.
     */
    private Locator accessRow(String email) {
        return dialog().locator("xpath=.//span[normalize-space(text())='" + email + "']"
            + "/ancestor::div[.//*[@role='combobox']][1]").first();
    }

    // ------------------------------------------------------------------ Import

    /** Picks the iCalendar file to import. */
    public CalendarModal importFile(java.nio.file.Path file) {
        dialog().locator("input[type=file]").setInputFiles(file);
        return this;
    }

    /** The calendar the import writes into. */
    public CalendarModal importTo(String calendarName) {
        Locator select = dialog().locator("[role=combobox]").last();
        select.click();
        page.locator("li[role=option]")
            .filter(new Locator.FilterOptions().setHasText(calendarName)).first().click();
        page.locator("li[role=option]").first().waitFor(
            new Locator.WaitForOptions().setState(WaitForSelectorState.DETACHED));
        return this;
    }

    public Locator importButton() {
        return dialog().getByRole(AriaRole.BUTTON,
            new Locator.GetByRoleOptions().setName("Import").setExact(true));
    }

    /** Starts the import and waits for the dialog to give an answer, whichever it is. */
    public CalendarModal startImport() {
        importButton().click();
        return this;
    }

    public void create() {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Create").setExact(true))
            .last().click();
        nameInput().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.DETACHED));
    }

    public void save() {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Save").setExact(true))
            .last().click();
        // the dialog closing is the signal the write went through, not an arbitrary delay
        dialog().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.DETACHED));
    }

    public void close() {
        page.getByLabel("close").last().click();
    }
}
